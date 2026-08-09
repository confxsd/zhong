import SwiftUI
import UIKit

struct SettingsView: View {
    @AppStorage("apiBaseURL") private var apiBaseURL = ""
    @State private var isTesting = false
    @State private var testResult: String?

    private var defaultURL: String { "https://your-app.username.workers.dev" }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("API Base URL", text: $apiBaseURL, prompt: Text(defaultURL))
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .disableAutocorrection(true)
                } header: {
                    Text("Cloudflare Backend")
                } footer: {
                    Text("Deploy the Zhong server to Cloudflare Workers and enter the URL here. For local development, use http://YOUR_MAC_IP:4450.")
                }

                Section {
                    Button {
                        Task { await testConnection() }
                    } label: {
                        HStack {
                            Text("Test Connection")
                            Spacer()
                            if isTesting {
                                ProgressView()
                            }
                        }
                    }

                    if let result = testResult {
                        HStack {
                            Image(systemName: result.contains("✅") ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .foregroundStyle(result.contains("✅") ? .green : .red)
                            Text(result)
                                .font(.caption)
                        }
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func testConnection() async {
        isTesting = true
        testResult = nil
        let url = apiBaseURL.isEmpty ? defaultURL : apiBaseURL

        guard let testURL = URL(string: "\(url)/api/health") else {
            testResult = "Invalid URL"
            isTesting = false
            return
        }

        do {
            let (_, response) = try await URLSession.shared.data(for: URLRequest(url: testURL, timeoutInterval: 10))
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                testResult = "✅ Connected — \(url)"
            } else {
                testResult = "Server returned status \(String(describing: (response as? HTTPURLResponse)?.statusCode))"
            }
        } catch {
            testResult = "❌ \(error.localizedDescription)"
        }

        isTesting = false
    }
}