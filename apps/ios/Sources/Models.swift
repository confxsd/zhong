import Foundation

struct Segment: Decodable, Identifiable {
    var id: String { text + pinyin }
    let text: String
    let pinyin: String
    let literal: String
}

struct CharBreakdown: Decodable, Identifiable {
    var id: String { char }
    let char: String
    let pinyin: String
    let meaning: String
    let note: String
}

struct GrammarPoint: Decodable, Identifiable {
    var id: String { point }
    let point: String
    let explanation: String
}

struct RecognizedWord: Decodable, Identifiable {
    var id: String { hanzi }
    let hanzi: String
    let meaning: String
}

struct VocabItem: Decodable {
    let hanzi: String
    let pinyin: String
    let meaning: String
    let example: String
    let exampleTranslation: String
    let saved: Bool
    let alreadyKnown: Bool
    let dbId: Int?

    enum CodingKeys: String, CodingKey {
        case hanzi, pinyin, meaning, example, saved, alreadyKnown
        case exampleTranslation = "example_translation"
        case dbId = "id"
    }
}

struct TeachResult: Decodable {
    let sessionId: Int
    let text: String
    let pinyin: String
    let translation: String
    let segments: [Segment]
    let breakdown: [CharBreakdown]
    let grammar: [GrammarPoint]
    let notes: [String]
    let recognized: [RecognizedWord]
    let vocab: [VocabItem]

    enum CodingKeys: String, CodingKey {
        case sessionId, text, pinyin, translation, segments, breakdown, grammar, notes, recognized, vocab
    }
}

struct ApiError: Decodable {
    let error: String
}