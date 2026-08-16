import AppKit
import Foundation

/// Zhōng menubar app — a small tray icon that shows whether the Zhōng cloud
/// backend (zhong.rome.markets) is reachable and opens the app's pages.
final class ZhongMenuBarApp: NSObject, NSApplicationDelegate, NSMenuDelegate {
    fileprivate static let shared = ZhongMenuBarApp()

    private var statusItem: NSStatusItem!
    private var menu: NSMenu!
    private var statusRowItem: NSMenuItem!
    private var timer: Timer?
    private var serverUp = false

    private let serverURL: URL

    override init() {
        let defaultURL = URL(string: "https://zhong.rome.markets")!
        let cfgURL = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".zhong/config.json")
        if let data = try? Data(contentsOf: cfgURL),
           let cfg = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let url = cfg["serverUrl"] as? String {
            serverURL = URL(string: url) ?? defaultURL
        } else {
            serverURL = defaultURL
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
        statusRowItem = statusRow()
        menu.addItem(statusRowItem)
        menu.addItem(.separator())
        menu.addItem(item("Quit", #selector(quitNow), "q"))
        menu.addItem(.separator())
        refreshMenu()
    }

    private func refreshMenu() {
        statusRowItem.title = serverUp ? "● Cloud connected" : "○ Cloud unreachable"
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

    // The system Services entry is provided by the dedicated ZhongService.app
    // (apps/service). This menubar app only opens the cloud web app.

    @objc private func quitNow() {
        NSApp.terminate(nil)
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