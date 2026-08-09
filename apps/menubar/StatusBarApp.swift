import AppKit
import Foundation

/// Zhōng menubar app — a small tray icon that knows whether the Zhōng server
/// is alive, can open the app's pages, and can start/stop the server via the
/// `zhong` CLI (path read from ~/.zhong/config.json, written by the CLI).
final class ZhongMenuBarApp: NSObject, NSApplicationDelegate, NSMenuDelegate {
    fileprivate static let shared = ZhongMenuBarApp()

    private var statusItem: NSStatusItem!
    private var menu: NSMenu!
    private var statusRowItem: NSMenuItem!
    private var timer: Timer?
    private var serverUp = false

    private let serverURL: URL
    private let cliPath: String
    private let nodePath: String

    override init() {
        let defaults = ("", URL(string: "http://localhost:4450")!, "")
        let cfgURL = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".zhong/config.json")
        if let data = try? Data(contentsOf: cfgURL),
           let cfg = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            cliPath = cfg["cliPath"] as? String ?? defaults.0
            nodePath = cfg["nodePath"] as? String ?? defaults.2
            let url = cfg["serverUrl"] as? String ?? defaults.1.absoluteString
            serverURL = URL(string: url) ?? defaults.1
        } else {
            cliPath = defaults.0
            nodePath = defaults.2
            serverURL = defaults.1
        }
        super.init()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let button = statusItem.button {
            let attrs: [NSAttributedString.Key: Any] = [
                .font: NSFont.systemFont(ofSize: 12, weight: .bold),
            ]
            button.attributedTitle = NSAttributedString(string: "中", attributes: attrs)
            button.toolTip = "Zhōng — Chinese study companion"
        }
        menu = NSMenu()
        menu.delegate = self
        statusItem.menu = menu
        rebuildMenu()

        let t = Timer(timeInterval: 3, repeats: true) { [weak self] _ in self?.checkServer() }
        t.tolerance = 1.0
        RunLoop.main.add(t, forMode: .common)
        checkServer()
    }

    func applicationWillTerminate(_ notification: Notification) {
        timer?.invalidate()
    }

    // MARK: - Menu

    func menuWillOpen(_ menu: NSMenu) {
        refreshMenu()
    }

    private func rebuildMenu() {
        menu.removeAllItems()
        menu.addItem(item("Open Zhōng", #selector(openApp), "o"))
        menu.addItem(item("Review · 复习", #selector(openReview)))
        menu.addItem(item("Library · 词库", #selector(openLibrary)))
        menu.addItem(.separator())
        menu.addItem(item("Start server", #selector(startServer)))
        menu.addItem(item("Stop server", #selector(stopServer)))
        menu.addItem(.separator())
        statusRowItem = statusRow()
        menu.addItem(statusRowItem)
        menu.addItem(.separator())
        menu.addItem(item("Quit", #selector(quitNow), "q"))
        menu.addItem(.separator())
        refreshMenu()
    }

    private func refreshMenu() {
        let startRow = menu.items.first { $0.action == #selector(startServer) }
        let stopRow = menu.items.first { $0.action == #selector(stopServer) }
        let canControl = !cliPath.isEmpty && !nodePath.isEmpty
        startRow?.isEnabled = canControl && !serverUp
        stopRow?.isEnabled = canControl && serverUp
        statusRowItem.title = serverUp ? "● Server running on :4450" : "○ Server stopped"
    }

    private func statusRow() -> NSMenuItem {
        let row = NSMenuItem(title: "○ Server stopped", action: nil, keyEquivalent: "")
        row.target = self
        row.isEnabled = false
        return row
    }

    private func item(_ title: String, _ action: Selector, _ key: String = "") -> NSMenuItem {
        let i = NSMenuItem(title: title, action: action, keyEquivalent: key)
        i.target = self
        return i
    }

    // MARK: - Actions

    @objc private func openApp() { NSWorkspace.shared.open(serverURL) }
    @objc private func openReview() { NSWorkspace.shared.open(serverURL.appendingPathComponent("review")) }
    @objc private func openLibrary() { NSWorkspace.shared.open(serverURL.appendingPathComponent("library")) }

    // MARK: - macOS Services ("Teach with Zhōng" in right-click → Services)

    /// Entry point for the service declared in Info.plist (NSServices → NSMessage "zhongTeach").
    /// Called by the system with the selected text on the pasteboard.
    @objc func zhongTeach(_ pboard: NSPasteboard, userData: String?, error: AutoreleasingUnsafeMutablePointer<NSString?>?) {
        guard let text = pboard.string(forType: .string)?
            .trimmingCharacters(in: .whitespacesAndNewlines),
            !text.isEmpty
        else { return }
        openText(text)
    }

    @objc private func openText(_ text: String) {
        guard var comps = URLComponents(url: serverURL, resolvingAgainstBaseURL: false),
              let url = {
                  comps.queryItems = [URLQueryItem(name: "text", value: String(text.prefix(5000)))]
                  return comps.url
              }()
        else { return }
        NSWorkspace.shared.open(url)
    }

    @objc private func startServer() { runCLI("start") }
    @objc private func stopServer() {
        runCLI("stop")
        serverUp = false
        refreshMenu()
    }

    @objc private func quitNow() {
        NSApp.terminate(nil)
    }

    private func runCLI(_ arg: String) {
        guard !cliPath.isEmpty, !nodePath.isEmpty else { return }
        let p = Process()
        p.executableURL = URL(fileURLWithPath: nodePath) // require explicit node: GUI PATH has no node
        p.arguments = [cliPath, arg]
        p.standardOutput = FileHandle.nullDevice
        p.standardError = FileHandle.nullDevice
        do {
            try p.run()
        } catch {
            NSLog("zhong: failed to run %@ %@: %@", nodePath, arg, error.localizedDescription)
        }
    }

    // MARK: - Health check

    private func checkServer() {
        var req = URLRequest(url: serverURL.appendingPathComponent("api/health"))
        req.timeoutInterval = 3
        URLSession.shared.dataTask(with: req) { [weak self] data, resp, _ in
            let up = (resp as? HTTPURLResponse)?.statusCode == 200 && data != nil && data!.count > 0
            DispatchQueue.main.async {
                guard let self else { return }
                if self.serverUp != up {
                    self.serverUp = up
                    self.refreshMenu()
                }
            }
        }.resume()
    }
}

let app = NSApplication.shared
app.delegate = ZhongMenuBarApp.shared
app.setActivationPolicy(.accessory) // no dock icon
app.run()