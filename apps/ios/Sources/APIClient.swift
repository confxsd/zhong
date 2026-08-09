import Foundation

actor APIClient {
    static let shared = APIClient()

    private var baseURL: String {
        UserDefaults.standard.string(forKey: "apiBaseURL") ?? "http://localhost:4450"
    }

    private let decoder = JSONDecoder()

    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        return e
    }()

    func teach(text: String) async throws -> TeachResult {
        guard let url = URL(string: "\(baseURL)/api/translate") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 120
        request.httpBody = try encoder.encode(["text": text])

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }

        if httpResponse.statusCode >= 400 {
            if let apiError = try? decoder.decode(ApiError.self, from: data) {
                throw NSError(domain: "Zhong", code: httpResponse.statusCode,
                              userInfo: [NSLocalizedDescriptionKey: apiError.error])
            }
            throw URLError(.badServerResponse)
        }

        return try decoder.decode(TeachResult.self, from: data)
    }
}