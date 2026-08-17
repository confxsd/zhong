import SwiftUI
import AppIntents

@main
struct ZhongIOSApp: App {
    var body: some Scene {
        WindowGroup {
            TabView {
                TeachView()
                    .tabItem {
                        Label("Teach", systemImage: "character.textbox.zh")
                    }

                SettingsView()
                    .tabItem {
                        Label("Settings", systemImage: "gearshape")
                    }
            }
            .tint(Theme.accent)
        }
    }
}