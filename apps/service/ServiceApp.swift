import AppKit
import Foundation

/// Standalone macOS service host.
/// Advertises "Teach with Zhōng" in the right-click → Services menu of every
/// app (Safari, Notes, Pages, Word, Mail…). Installed into ~/Library/Services;
/// the system launches it on demand when the service is invoked.
final class ServiceDelegate: NSObject, NSApplicationDelegate {
    private let serverURL = URL(string: "http://localhost:4450")!

    func applicationDidFinishLaunching(_ notification: Notification) {}

    /// Entry point for NSServices → NSMessage "zhongTeach" (Info.plist).
    /// Received with the user's selected text on the pasteboard.
    @objc func zhongTeach(_ pboard: NSPasteboard, userData: String?, error: AutoreleasingUnsafeMutablePointer<NSString?>?) {
        guard let text = pboard.string(forType: .string)?
            .trimmingCharacters(in: .whitespacesAndNewlines),
            !text.isEmpty
        else { return }
        openLesson(text)
    }

    private func openLesson(_ text: String) {
        let compact = String(text.prefix(5000))
        var comps = URLComponents(url: serverURL, resolvingAgainstBaseURL: false)
        comps?.queryItems = [URLQueryItem(name: "text", value: compact)]
        guard let url = comps?.url else { return }

        checkServer { up in
            DispatchQueue.main.async {
                if up {
                    NSWorkspace.shared.open(url)
                } else {
                    let alert = NSAlert()
                    alert.messageText = "Zhōng server is not running"
                    alert.informativeText = "Run `zhong` in a terminal to start it, then select the text again."
                    alert.addButton(withTitle: "OK")
                    alert.runModal()
                }
            }
        }
    }

    private func checkServer(_ done: @escaping (Bool) -> Void) {
        var req = URLRequest(url: serverURL.appendingPathComponent("api/health"))
        req.timeoutInterval = 3
        URLSession.shared.dataTask(with: req) { _, resp, _ in
            done((resp as? HTTPURLResponse)?.statusCode == 200)
        }.resume()
    }
}

let app = NSApplication.shared
let delegate = ServiceDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory) // no dock icon
app.run()