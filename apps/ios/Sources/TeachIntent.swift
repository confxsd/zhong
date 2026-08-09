import AppIntents
import Foundation

@available(iOS 18.0, *)
struct TeachTextIntent: AppIntent {
    static var title: LocalizedStringResource = "Teach with Zhong"
    static var description = IntentDescription(
        "Get an AI-powered Chinese lesson for selected text — translation, pinyin, character breakdown, and vocabulary.",
        categoryName: "Education"
    )
    static var openAppWhenRun: Bool = true
    static var isDiscoverable: Bool = true

    @Parameter(
        title: "Chinese Text",
        description: "The Chinese text to analyze and learn from",
        inputOptions: .init(
            capitalizationType: .none,
            autocorrect: false,
            smartQuotes: false,
            smartDashes: false
        )
    )
    var text: String

    @MainActor
    func perform() async throws -> some IntentResult {
        UserDefaults.standard.set(text, forKey: "pendingTeachText")
        return .result()
    }
}

@available(iOS 18.0, *)
struct ZhongShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: TeachTextIntent(),
            phrases: [
                "Teach Chinese text with Zhong",
                "Analyze Chinese with Zhong",
                "Get a Chinese lesson with Zhong"
            ],
            shortTitle: "Teach with Zhong",
            systemImageName: "character.textbox.zh"
        )
    }
}