import SwiftUI

@MainActor
class TeachViewModel: ObservableObject {
    @Published var inputText = ""
    @Published var result: TeachResult?
    @Published var isLoading = false
    @Published var errorMessage: String?

    var canSubmit: Bool { !inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isLoading }

    func submit() async {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        isLoading = true
        errorMessage = nil
        result = nil

        do {
            let teachResult = try await APIClient.shared.teach(text: text)
            result = teachResult
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func teachText(_ text: String) async {
        inputText = text
        await submit()
    }

    func reset() {
        inputText = ""
        result = nil
        errorMessage = nil
        isLoading = false
    }

    func checkPendingIntent() {
        guard let pendingText = UserDefaults.standard.string(forKey: "pendingTeachText"),
              !pendingText.isEmpty else { return }
        UserDefaults.standard.removeObject(forKey: "pendingTeachText")
        Task { await teachText(pendingText) }
    }
}

struct TeachView: View {
    @StateObject private var vm = TeachViewModel()
    @FocusState private var isFocused: Bool

    var body: some View {
        NavigationStack {
            Group {
                if vm.result != nil {
                    TeachResultView(result: vm.result!) {
                        withAnimation { vm.reset() }
                    }
                    .transition(.move(edge: .trailing).combined(with: .opacity))
                } else {
                    inputView
                }
            }
            .navigationTitle("Zhong")
            .navigationBarTitleDisplayMode(.inline)
        }
        .onOpenURL { url in
            guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                  components.host == "teach",
                  let text = components.queryItems?.first(where: { $0.name == "text" })?.value,
                  let decoded = text.removingPercentEncoding else { return }
            Task { await vm.teachText(decoded) }
        }
        .onAppear {
            vm.checkPendingIntent()
        }
    }

    private var inputView: some View {
        VStack(spacing: 20) {
            Spacer()

            Text("Paste Chinese text to learn")
                .font(.title2)
                .foregroundStyle(.secondary)

            TextEditor(text: $vm.inputText)
                .focused($isFocused)
                .font(.system(.body, design: .serif))
                .frame(minHeight: 140, maxHeight: 220)
                .padding(12)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(isFocused ? Color.blue.opacity(0.4) : Color.clear, lineWidth: 2)
                )
                .overlay(alignment: .topLeading) {
                    if vm.inputText.isEmpty {
                        Text("今天天气很好...")
                            .font(.system(.body, design: .serif))
                            .foregroundStyle(.tertiary)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 20)
                            .allowsHitTesting(false)
                    }
                }

            if let error = vm.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
            }

            Button {
                Task { await vm.submit() }
            } label: {
                HStack {
                    if vm.isLoading {
                        ProgressView()
                            .tint(.white)
                    }
                    Text(vm.isLoading ? "Teaching..." : "Teach Me")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(vm.canSubmit ? Color.blue : Color.blue.opacity(0.3))
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .animation(.easeInOut(duration: 0.2), value: vm.isLoading)
            }
            .disabled(!vm.canSubmit)

            Spacer()
        }
        .padding(24)
    }
}