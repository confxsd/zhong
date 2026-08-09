import AppKit
import ApplicationServices
import CoreGraphics

private struct InlineGrammar: Decodable {
    let point: String
    let explanation: String
}

private struct InlineVocab: Decodable {
    let hanzi: String
    let pinyin: String
    let meaning: String
}

private struct InlineLesson: Decodable {
    let translation: String
    let pinyin: String
    let grammar: [InlineGrammar]
    let notes: [String]
    let vocab: [InlineVocab]
}

/// Zhōng Picker — a PopClip-style companion.
/// Watches the frontmost app's selection via the public Accessibility (AX)
/// API. When Chinese text is selected, a small floating pill appears right at
/// the selection; clicking it opens the Zhōng lesson for that text.
/// Runs as an LSUIElement agent (no dock icon), launched by launchd at login.
final class PickerController: NSObject {
    private let serverURL = URL(string: "http://localhost:4450")!
    private let stickMax = 2000

    private var panel: NSPanel!
    private var lessonPanel: NSPanel!
    private var lessonStack: NSStackView!
    private var lessonScroll: NSScrollView!
    private var lessonDocument: NSView!
    private var permissionPanel: NSPanel?
    private let teachButton = NSButton()
    private let exitButton = NSButton()
    private let captionLabel = NSTextField(labelWithString: "Teach with Zhōng")

    private var granted = false
    private var lastKey = ""
    private var consumed = ""
    private var currentText = ""
    private var currentAnchor = NSRect.zero
    private var isPinned = false
    private var fallbackRequested = false
    private var lastFrontApp = ""
    private var pollTimer: Timer?
    private var eventMonitors: [Any] = []
    private let axQueue = DispatchQueue(label: "zhong.ax", qos: .userInitiated)

    private static let logURL = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent(".zhong/picker.log")

    private func log(_ s: String) {
        let line = (s + "\n").data(using: .utf8) ?? Data()
        do {
            if !FileManager.default.fileExists(atPath: Self.logURL.path) {
                try line.write(to: Self.logURL)
            } else if let h = try? FileHandle(forWritingTo: Self.logURL) {
                h.seekToEndOfFile()
                try? h.write(contentsOf: line)
                try? h.close()
            }
        } catch {}
    }

    override init() {
        super.init()
        buildUI()
    }

    func start() {
        granted = AXIsProcessTrusted()
        log("zhong-picker: start, AXIsProcessTrusted = \(granted)")
        if !granted { showPermissionPanel() }

        pollTimer = Timer.scheduledTimer(withTimeInterval: 0.45, repeats: true) { [weak self] _ in
            guard let self else { return }
            let trusted = AXIsProcessTrusted()
            if trusted != self.granted {
                self.granted = trusted
                self.log("zhong-picker: accessibility granted = \(trusted)")
                DispatchQueue.main.async {
                    if trusted {
                        self.teachButton.isEnabled = true
                        if let p = self.permissionPanel {
                            p.orderOut(nil)
                            self.permissionPanel = nil
                        }
                        self.hide()
                    } else {
                        self.showPermissionPanel()
                    }
                }
            }
            guard trusted else { return }
            // NSWorkspace / NSEvent APIs are main-thread-only — resolve here.
            guard let front = NSWorkspace.shared.frontmostApplication else { return }
            let pid = front.processIdentifier
            let appName = front.localizedName ?? "?"
            let mousePoint = NSEvent.mouseLocation
            let fallback = self.fallbackRequested
            self.fallbackRequested = false
            if appName != self.lastFrontApp {
                self.lastFrontApp = appName
                self.log("zhong-picker: scanning front app = \(appName)")
            }
            self.axQueue.async { self.scanSelection(pid: pid, appName: appName, mousePoint: mousePoint, fallbackRequested: fallback) }
        }
        pollTimer?.tolerance = 0.1

        // The picker is intentionally pinned. It closes only through its
        // explicit exit control, so changing apps or clicking elsewhere does
        // not destroy the lesson the user is reading.
        // This is a passive monitor: it observes left-button release only to
        // request one Electron fallback read. It never intercepts or rewrites
        // any mouse event, and it does not observe right-clicks.
        NSEvent.addGlobalMonitorForEvents(matching: [.leftMouseUp]) { [weak self] _ in
            self?.fallbackRequested = true
        }

        // Escape is the keyboard equivalent of the explicit close control.
        // The global monitor observes the key without consuming it from the
        // active application, so the picker adds no keyboard side effects.
        let escapeMonitor = NSEvent.addGlobalMonitorForEvents(matching: [.keyDown]) { [weak self] event in
            guard event.keyCode == 53 else { return }
            DispatchQueue.main.async { self?.dismiss() }
        }
        if let escapeMonitor { eventMonitors.append(escapeMonitor) }
    }

    // MARK: - Selection scanning

    private func scanSelection(pid: pid_t, appName: String, mousePoint: NSPoint, fallbackRequested: Bool) {
        let axSystem = AXUIElementCreateSystemWide()
        let axApp = AXUIElementCreateApplication(pid)
        let focusedRaw = getAttr(axSystem, kAXFocusedUIElementAttribute)
            ?? getAttr(axApp, kAXFocusedUIElementAttribute)
        let focused = focusedRaw.map { unsafeBitCast($0, to: AXUIElement.self) }

        var text = focused.flatMap { getAttr($0, kAXSelectedTextAttribute) as? String } ?? ""
        if text.isEmpty {
            // Some apps expose the selection at the app level only.
            text = (getAttr(axApp, kAXSelectedTextAttribute) as? String) ?? ""
        }
        if text.isEmpty && focused == nil && fallbackRequested {
            // Electron apps such as Cursor often expose no AX focused element.
            // Copy the active selection, read it, then restore the clipboard.
            text = copySelectedText()
        }
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        let hasCJK = trimmed.range(of: "[\\u3400-\\u9FFF\\uF900-\\uFAFF]", options: .regularExpression) != nil
        let verdict = Self.selectionVerdict(text: trimmed, hasCJK: hasCJK, frame: NSRect.zero)

        if !trimmed.isEmpty {
            self.log("zhong-picker: AX text in \(appName): \(trimmed.prefix(80)) (cjk=\(hasCJK), show=\(verdict.show))")
        }

        // Position must come from the main thread (mouseLocation fallback), so
        // only the decision travels here; UI update happens on main.
        DispatchQueue.main.async {
            guard !self.isPinned else { return }
            if verdict.show {
                if verdict.key == self.consumed { return } // already taught this selection
                if self.lastKey != verdict.key {
                    self.lastKey = verdict.key
                    self.currentText = trimmed
                    self.isPinned = true
                    let frame = focused.map { self.windowFrame(forAXFrame: self.frameOf($0), near: mousePoint) }
                        ?? NSRect(x: mousePoint.x, y: mousePoint.y, width: 2, height: 2)
                    self.currentAnchor = frame
                    self.show(at: frame, text: trimmed)
                }
            } else if self.lastKey != "" {
                self.lastKey = ""
                self.hide()
            }
        }
    }

    private func copySelectedText() -> String {
        let pasteboard = NSPasteboard.general
        let changeCount = pasteboard.changeCount
        let saved = pasteboard.pasteboardItems?.map { item in
            item.types.compactMap { type -> (NSPasteboard.PasteboardType, Data)? in
                guard let data = item.data(forType: type) else { return nil }
                return (type, data)
            }
        } ?? []

        let source = CGEventSource(stateID: .hidSystemState)
        let keyDown = CGEvent(keyboardEventSource: source, virtualKey: 8, keyDown: true)
        let keyUp = CGEvent(keyboardEventSource: source, virtualKey: 8, keyDown: false)
        keyDown?.flags = .maskCommand
        keyUp?.flags = .maskCommand
        keyDown?.post(tap: .cgSessionEventTap)
        keyUp?.post(tap: .cgSessionEventTap)
        Thread.sleep(forTimeInterval: 0.06)
        let selected = pasteboard.string(forType: .string) ?? ""
        let didCopy = pasteboard.changeCount != changeCount

        pasteboard.clearContents()
        let restored = saved.map { pairs in
            let item = NSPasteboardItem()
            for (type, data) in pairs { item.setData(data, forType: type) }
            return item
        }
        if !restored.isEmpty { pasteboard.writeObjects(restored) }
        return didCopy ? selected : ""
    }

    private static func selectionVerdict(text: String, hasCJK: Bool, frame: NSRect) -> (show: Bool, key: String) {
        let ok = hasCJK && !text.isEmpty && text.count <= 2000
        if !ok { return (false, "") }
        if frame == .zero {
            let key = String(format: "%@", text)
            return (true, key)
        }
        let key = String(format: "%@|%.1f|%.1f", text, frame.origin.x, frame.origin.y)
        return (true, key)
    }

    // MARK: - AX helpers

    private func getAttr(_ element: AXUIElement, _ name: String) -> CFTypeRef? {
        var value: CFTypeRef?
        let err = AXUIElementCopyAttributeValue(element, name as CFString, &value)
        return err == AXError.success ? value : nil
    }

    private func frameOf(_ element: AXUIElement) -> NSRect {
        var p = CGPoint.zero
        var s = CGSize.zero
        if let v = getAttr(element, kAXPositionAttribute), CFGetTypeID(v) == AXValueGetTypeID() {
            AXValueGetValue(unsafeBitCast(v, to: AXValue.self), .cgPoint, &p)
        }
        if let v = getAttr(element, kAXSizeAttribute), CFGetTypeID(v) == AXValueGetTypeID() {
            AXValueGetValue(unsafeBitCast(v, to: AXValue.self), .cgSize, &s)
        }
        if p == .zero && s == .zero {
            let m = NSEvent.mouseLocation
            return NSRect(x: m.x, y: m.y, width: 12, height: 12)
        }
        return NSRect(x: p.x, y: p.y, width: s.width, height: s.height)
    }

    private func windowFrame(forAXFrame frame: NSRect, near point: NSPoint) -> NSRect {
        guard frame != .zero,
              let screen = NSScreen.screens.first(where: { $0.frame.contains(point) })
        else { return NSRect(x: point.x, y: point.y, width: 2, height: 2) }
        // AX uses a top-left origin; AppKit windows use a bottom-left origin.
        return NSRect(
            x: frame.origin.x,
            y: screen.frame.maxY - frame.maxY,
            width: max(frame.width, 2),
            height: max(frame.height, 2)
        )
    }

    // MARK: - Panel

    private func styleSurface(_ view: NSView, radius: CGFloat) {
        view.wantsLayer = true
        view.layer?.backgroundColor = NSColor.windowBackgroundColor.withAlphaComponent(0.97).cgColor
        view.layer?.cornerRadius = radius
        view.layer?.borderWidth = 0
        view.layer?.borderColor = NSColor.clear.cgColor
        view.layer?.shadowColor = NSColor.black.cgColor
        view.layer?.shadowOpacity = 0.18
        view.layer?.shadowRadius = 14
        view.layer?.shadowOffset = CGSize(width: 0, height: -4)
        view.layer?.masksToBounds = false
    }

    private func buildUI() {
        let panel = NSPanel(
            contentRect: NSRect(x: 0, y: 0, width: 190, height: 42),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered, defer: false
        )
        panel.level = .floating
        panel.isFloatingPanel = true
        panel.hidesOnDeactivate = false
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = false
        panel.isReleasedWhenClosed = false
        panel.alphaValue = 0

        let surface = NSView()
        styleSurface(surface, radius: 13)
        panel.contentView = surface

        let stack = NSStackView()
        stack.orientation = .horizontal
        stack.spacing = 10
        stack.edgeInsets = NSEdgeInsets(top: 7, left: 8, bottom: 7, right: 14)

        teachButton.bezelStyle = .regularSquare
        teachButton.title = "中"
        teachButton.font = .systemFont(ofSize: 16, weight: .bold)
        teachButton.isBordered = false
        teachButton.focusRingType = .none
        teachButton.wantsLayer = true
        teachButton.layer?.cornerRadius = 14
        teachButton.layer?.backgroundColor = NSColor(calibratedRed: 0.78, green: 0.26, blue: 0.17, alpha: 1).cgColor
        teachButton.contentTintColor = .white
        teachButton.setAccessibilityLabel("Teach with Zhōng")
        teachButton.target = self
        teachButton.action = #selector(teachClicked)
        teachButton.translatesAutoresizingMaskIntoConstraints = false
        teachButton.widthAnchor.constraint(equalToConstant: 28).isActive = true
        teachButton.heightAnchor.constraint(equalToConstant: 28).isActive = true

        exitButton.title = "×"
        exitButton.bezelStyle = .regularSquare
        exitButton.isBordered = false
        exitButton.focusRingType = .none
        exitButton.font = .systemFont(ofSize: 17, weight: .regular)
        exitButton.contentTintColor = .secondaryLabelColor
        exitButton.target = self
        exitButton.action = #selector(exitPicker)
        exitButton.translatesAutoresizingMaskIntoConstraints = false
        exitButton.widthAnchor.constraint(equalToConstant: 22).isActive = true
        exitButton.heightAnchor.constraint(equalToConstant: 24).isActive = true

        captionLabel.font = .systemFont(ofSize: 13, weight: .semibold)
        captionLabel.textColor = .labelColor
        captionLabel.maximumNumberOfLines = 1
        captionLabel.lineBreakMode = .byTruncatingTail

        stack.addArrangedSubview(teachButton)
        stack.addArrangedSubview(captionLabel)
        stack.addArrangedSubview(NSView())
        stack.addArrangedSubview(exitButton)
        surface.addSubview(stack)
        stack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: surface.topAnchor),
            stack.bottomAnchor.constraint(equalTo: surface.bottomAnchor),
            stack.leadingAnchor.constraint(equalTo: surface.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: surface.trailingAnchor),
        ])

        self.panel = panel
        buildLessonPanel()
    }

    @objc private func teachClicked() {
        guard !currentText.isEmpty else { return }
        let text = currentText
        consumed = lastKey
        hide()
        showLessonLoading(text: text)
        requestLesson(text: text)
    }

    private func show(at frame: NSRect, text: String) {
        let width = captionLabel.intrinsicContentSize.width + 112
        let pillW = min(max(width, 190), 360)
        let pillH: CGFloat = 42

        let preview = String(text.prefix(28)) + (text.count > 28 ? "…" : "")
        captionLabel.stringValue = "Teach: \(preview)"

        position(panel, near: frame, width: pillW, height: pillH)
        panel.orderFrontRegardless()
        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = 0.12
            self.panel.animator().alphaValue = 1
        }
    }

    private func buildLessonPanel() {
        let lesson = NSPanel(contentRect: NSRect(x: 0, y: 0, width: 390, height: 320), styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        lesson.level = .floating
        lesson.isFloatingPanel = true
        lesson.hidesOnDeactivate = false
        lesson.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        lesson.isOpaque = false
        lesson.backgroundColor = .clear
        lesson.hasShadow = false
        lesson.isReleasedWhenClosed = false
        lesson.alphaValue = 0

        let surface = NSView()
        styleSurface(surface, radius: 16)
        lesson.contentView = surface

        lessonScroll = NSScrollView()
        lessonScroll.hasVerticalScroller = true
        lessonScroll.scrollerStyle = .overlay
        lessonScroll.borderType = .noBorder
        lessonScroll.drawsBackground = false
        lessonScroll.autohidesScrollers = true
        lessonScroll.translatesAutoresizingMaskIntoConstraints = false
        surface.addSubview(lessonScroll)

        lessonDocument = NSView()
        lessonDocument.translatesAutoresizingMaskIntoConstraints = false
        lessonScroll.documentView = lessonDocument

        lessonStack = NSStackView()
        lessonStack.orientation = .vertical
        lessonStack.alignment = .leading
        lessonStack.spacing = 9
        lessonStack.edgeInsets = NSEdgeInsets(top: 0, left: 0, bottom: 0, right: 0)
        lessonDocument.addSubview(lessonStack)
        lessonStack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            lessonScroll.topAnchor.constraint(equalTo: surface.topAnchor),
            lessonScroll.bottomAnchor.constraint(equalTo: surface.bottomAnchor),
            lessonScroll.leadingAnchor.constraint(equalTo: surface.leadingAnchor),
            lessonScroll.trailingAnchor.constraint(equalTo: surface.trailingAnchor),
            lessonDocument.leadingAnchor.constraint(equalTo: lessonScroll.contentView.leadingAnchor),
            lessonDocument.trailingAnchor.constraint(equalTo: lessonScroll.contentView.trailingAnchor),
            lessonDocument.topAnchor.constraint(equalTo: lessonScroll.contentView.topAnchor),
            lessonDocument.bottomAnchor.constraint(equalTo: lessonScroll.contentView.bottomAnchor),
            lessonStack.topAnchor.constraint(equalTo: lessonDocument.topAnchor, constant: 16),
            lessonStack.bottomAnchor.constraint(equalTo: lessonDocument.bottomAnchor, constant: -16),
            lessonStack.leadingAnchor.constraint(equalTo: lessonDocument.leadingAnchor, constant: 20),
            lessonStack.trailingAnchor.constraint(equalTo: lessonDocument.trailingAnchor, constant: -28)
        ])
        self.lessonPanel = lesson
    }

    private func clearLessonStack() {
        lessonStack.arrangedSubviews.forEach {
            lessonStack.removeArrangedSubview($0)
            $0.removeFromSuperview()
        }
    }

    private func addLessonView(_ view: NSView) {
        lessonStack.addArrangedSubview(view)
        view.translatesAutoresizingMaskIntoConstraints = false
        view.widthAnchor.constraint(equalTo: lessonStack.widthAnchor).isActive = true
    }

    private func makeLabel(_ text: String, size: CGFloat, weight: NSFont.Weight = .regular, color: NSColor = .labelColor, lines: Int = 1, serif: Bool = false) -> NSTextField {
        let field = NSTextField(labelWithString: text)
        field.font = serif ? (NSFont(name: "Noto Serif SC", size: size) ?? NSFont.systemFont(ofSize: size, weight: weight)) : NSFont.systemFont(ofSize: size, weight: weight)
        field.textColor = color
        field.alignment = .left
        field.baseWritingDirection = .leftToRight
        field.maximumNumberOfLines = lines
        field.lineBreakMode = lines > 1 ? .byWordWrapping : .byTruncatingTail
        field.usesSingleLineMode = lines == 1
        field.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        return field
    }

    private func showLessonLoading(text: String) {
        clearLessonStack()
        addLessonHeader("仲  ·  Quick lesson")
        addLessonView(makeLabel(text, size: 19, weight: .semibold, lines: 6, serif: true))
        addLessonView(makeLabel("Preparing translation, grammar, and useful words…", size: 12, color: .secondaryLabelColor))
        position(lessonPanel, near: currentAnchor, width: 460, height: 220)
        fitLessonPanel(maxHeight: 520)
        lessonPanel.orderFrontRegardless()
        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = 0.14
            self.lessonPanel.animator().alphaValue = 1
        }
    }

    private func requestLesson(text: String) {
        var request = URLRequest(url: serverURL.appendingPathComponent("api/translate"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["text": String(text.prefix(5000))])
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self else { return }
            guard let data, error == nil, (response as? HTTPURLResponse)?.statusCode == 200,
                  let lesson = try? JSONDecoder().decode(InlineLesson.self, from: data) else {
                DispatchQueue.main.async { self.showLessonError() }
                return
            }
            DispatchQueue.main.async { self.showLesson(lesson, text: text) }
        }.resume()
    }

    private func showLesson(_ lesson: InlineLesson, text: String) {
        clearLessonStack()
        addLessonHeader("仲  ·  Quick lesson")
        addLessonView(makeLabel(text, size: 20, weight: .semibold, lines: 8, serif: true))
        addLessonView(makeLabel(lesson.pinyin, size: 12, color: .secondaryLabelColor))
        addLessonView(makeLabel(lesson.translation, size: 16, weight: .medium, lines: 5))
        if let grammar = lesson.grammar.first {
            addLessonView(makeLabel("Grammar · \(grammar.point)", size: 12, weight: .bold, color: NSColor(calibratedRed: 0.78, green: 0.26, blue: 0.17, alpha: 1)))
            addLessonView(makeLabel(grammar.explanation, size: 12, color: .secondaryLabelColor, lines: 6))
        }
        if !lesson.vocab.isEmpty {
            let words = lesson.vocab.prefix(4).map { "\($0.hanzi)  \($0.pinyin)  \($0.meaning)" }.joined(separator: "  ·  ")
            addLessonView(makeLabel("Words · \(words)", size: 12, weight: .medium, lines: 5))
        }
        if let note = lesson.notes.first {
            addLessonView(makeLabel("Tip · \(note)", size: 11, color: .secondaryLabelColor, lines: 5))
        }
        let full = NSButton(title: "Open full lesson", target: self, action: #selector(openFullLesson))
        full.bezelStyle = .rounded
        full.focusRingType = .none
        full.controlSize = .small
        addLessonView(full)
        position(lessonPanel, near: currentAnchor, width: 460, height: 500)
        fitLessonPanel(maxHeight: 560)
        lessonPanel.orderFrontRegardless()
    }

    private func addLessonHeader(_ title: String) {
        let row = NSStackView()
        row.orientation = .horizontal
        row.spacing = 8
        row.addArrangedSubview(makeLabel(title, size: 14, weight: .semibold, color: NSColor(calibratedRed: 0.78, green: 0.26, blue: 0.17, alpha: 1)))
        let spacer = NSView()
        spacer.setContentHuggingPriority(.defaultLow, for: .horizontal)
        row.addArrangedSubview(spacer)
        let close = NSButton(title: "×", target: self, action: #selector(closeLesson))
        close.bezelStyle = .regularSquare
        close.isBordered = false
        close.focusRingType = .none
        close.font = .systemFont(ofSize: 18)
        close.contentTintColor = .secondaryLabelColor
        row.addArrangedSubview(close)
        addLessonView(row)
    }

    private func showLessonError() {
        clearLessonStack()
        addLessonView(makeLabel("Couldn’t reach Zhong", size: 15, weight: .semibold))
        addLessonView(makeLabel("The server may be starting. Try the selection again in a moment.", size: 12, color: .secondaryLabelColor, lines: 2))
        let close = NSButton(title: "Close", target: self, action: #selector(closeLesson))
        close.bezelStyle = .rounded
        addLessonView(close)
        position(lessonPanel, near: currentAnchor, width: 390, height: 150)
    }

    private func fitLessonPanel(maxHeight: CGFloat) {
        lessonPanel.contentView?.layoutSubtreeIfNeeded()
        lessonScroll.layoutSubtreeIfNeeded()
        lessonStack.layoutSubtreeIfNeeded()
        let measuredHeight = lessonStack.fittingSize.height
        let compactHeight = min(max(measuredHeight + 2, 132), maxHeight)
        position(lessonPanel, near: currentAnchor, width: 460, height: compactHeight)
    }

    private func position(_ window: NSPanel, near anchor: NSRect, width: CGFloat, height: CGFloat) {
        let anchorPoint = NSPoint(x: anchor.midX, y: anchor.midY)
        guard let screen = NSScreen.screens.first(where: { $0.frame.contains(anchorPoint) }) ?? NSScreen.main else { return }
        let actualWidth = min(width, screen.visibleFrame.width - 16)
        let actualHeight = min(height, screen.visibleFrame.height - 16)
        let gap: CGFloat = 10
        let safe = screen.visibleFrame.insetBy(dx: 8, dy: 8)
        let candidates = [
            // Prefer the upper-right side for selections near the lower-left.
            NSRect(x: anchor.maxX + gap, y: anchor.maxY - actualHeight, width: actualWidth, height: actualHeight),
            NSRect(x: anchor.maxX + gap, y: anchor.maxY + gap, width: actualWidth, height: actualHeight),
            NSRect(x: anchor.minX, y: anchor.maxY + gap, width: actualWidth, height: actualHeight),
            NSRect(x: anchor.maxX - actualWidth, y: anchor.maxY + gap, width: actualWidth, height: actualHeight),
            NSRect(x: anchor.maxX + gap, y: anchor.minY - actualHeight - gap, width: actualWidth, height: actualHeight),
            NSRect(x: anchor.midX - actualWidth / 2, y: anchor.maxY + gap, width: actualWidth, height: actualHeight),
            NSRect(x: anchor.midX - actualWidth / 2, y: anchor.minY - actualHeight - gap, width: actualWidth, height: actualHeight)
        ]
        let chosen = candidates.first(where: { safe.contains($0) }) ?? NSRect(
            x: min(max(anchor.maxX + gap, safe.minX), safe.maxX - actualWidth),
            y: min(max(anchor.maxY - actualHeight, safe.minY), safe.maxY - actualHeight),
            width: actualWidth,
            height: actualHeight
        )
        window.setFrame(chosen, display: false)
    }

    @objc private func closeLesson() { dismiss() }

    @objc private func exitPicker() { dismiss() }

    @objc private func openFullLesson() {
        guard !currentText.isEmpty else { return }
        var comps = URLComponents(url: serverURL, resolvingAgainstBaseURL: false)
        comps?.queryItems = [URLQueryItem(name: "text", value: String(currentText.prefix(5000)))]
        if let url = comps?.url { NSWorkspace.shared.open(url) }
    }

    private func hide() {
        NSAnimationContext.runAnimationGroup({ ctx in
            ctx.duration = 0.1
            self.panel.animator().alphaValue = 0
        }, completionHandler: { self.panel.orderOut(nil) })
        lessonPanel?.orderOut(nil)
    }

    private func dismiss() {
        isPinned = false
        lastKey = ""
        currentText = ""
        currentAnchor = .zero
        hide()
    }

    @objc private func appSwitched() {
        consumed = ""
        dismiss()
    }

    // MARK: - Accessibility permission guidance

    private func showPermissionPanel() {
        let panel = NSPanel(
            contentRect: NSRect(x: 0, y: 0, width: 430, height: 132),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered, defer: false
        )
        permissionPanel = panel
        panel.level = .floating
        panel.isFloatingPanel = true
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = false
        panel.isReleasedWhenClosed = false

        let surface = NSView()
        styleSurface(surface, radius: 14)
        panel.contentView = surface

        let text = NSTextField(labelWithString: "Zhōng needs Accessibility access to see text you select.\nGrant it, then reselect text anywhere.")
        text.font = .systemFont(ofSize: 13)
        text.textColor = .labelColor
        text.maximumNumberOfLines = 2

        let openBtn = NSButton(title: "Open System Settings", target: self, action: #selector(openSettings))
        openBtn.bezelStyle = .rounded
        openBtn.focusRingType = .none
        openBtn.controlSize = .regular

        let quitBtn = NSButton(title: "Quit for now", target: self, action: #selector(quit))
        quitBtn.bezelStyle = .rounded
        quitBtn.focusRingType = .none
        quitBtn.controlSize = .regular

        let row = NSStackView(views: [openBtn, quitBtn])
        row.orientation = .horizontal
        row.spacing = 8

        let stack = NSStackView(views: [text, row])
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = 12
        stack.setCustomSpacing(18, after: stack.views[0])
        surface.addSubview(stack)
        stack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: surface.topAnchor, constant: 18),
            stack.leadingAnchor.constraint(equalTo: surface.leadingAnchor, constant: 18),
            stack.trailingAnchor.constraint(equalTo: surface.trailingAnchor, constant: -18),
        ])

        if let screen = NSScreen.main {
            panel.setFrameOrigin(NSPoint(
                x: screen.visibleFrame.midX - 210,
                y: screen.visibleFrame.midY - 66
            ))
        }
        panel.orderFrontRegardless()
    }

    @objc private func openSettings() {
        if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility") {
            NSWorkspace.shared.open(url)
        }
    }

    @objc private func quit() {
        NSApp.terminate(nil)
    }
}

// Diagnostic mode: report this binary's Accessibility trust to stdout.
if CommandLine.arguments.contains("--check") {
    print(AXIsProcessTrusted() ? "granted" : "not-granted")
    exit(0)
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let controller = PickerController()
controller.start()
app.run()
