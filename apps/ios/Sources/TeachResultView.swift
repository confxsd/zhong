import SwiftUI

struct TeachResultView: View {
    let result: TeachResult
    let onDismiss: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                headerSection
                Divider()
                translationSection
                Divider()
                pinyinSection
                Divider()
                segmentsSection
                Divider()
                breakdownSection
                if !result.grammar.isEmpty {
                    Divider()
                    grammarSection
                }
                if !result.notes.isEmpty {
                    Divider()
                    notesSection
                }
                if !result.vocab.isEmpty {
                    Divider()
                    vocabSection
                }
            }
            .padding()
        }
        .background(Color(.systemBackground))
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Done") { onDismiss() }
            }
        }
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(result.text)
                .font(.system(size: 28, weight: .bold, design: .serif))
            if !result.recognized.isEmpty {
                HStack(spacing: 6) {
                    Image(systemName: "brain.head.profile")
                        .font(.caption)
                    Text("Recognized: \(result.recognized.map(\.hanzi).joined(separator: ", "))")
                        .font(.caption)
                }
                .foregroundStyle(.secondary)
                .padding(.top, 2)
            }
        }
    }

    private var translationSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Translation", systemImage: "globe")
                .font(.headline)
                .foregroundStyle(.blue)
            Text(result.translation)
                .font(.body)
                .foregroundStyle(.primary)
        }
    }

    private var pinyinSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Pinyin", systemImage: "waveform")
                .font(.headline)
                .foregroundStyle(.orange)
            Text(result.pinyin)
                .font(.system(.body, design: .serif))
                .foregroundStyle(.secondary)
        }
    }

    private var segmentsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Phrase by Phrase", systemImage: "text.word.spacing")
                .font(.headline)
                .foregroundStyle(.green)
            ForEach(result.segments) { seg in
                VStack(alignment: .leading, spacing: 2) {
                    Text(seg.text)
                        .font(.system(.body, design: .serif))
                    Text(seg.pinyin)
                        .font(.caption)
                        .foregroundStyle(.orange)
                    Text(seg.literal)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 4)
                .padding(.horizontal, 12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
    }

    private var breakdownSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Character Breakdown", systemImage: "character.square")
                .font(.headline)
                .foregroundStyle(.purple)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 140), spacing: 12)], spacing: 12) {
                ForEach(result.breakdown) { item in
                    VStack(spacing: 2) {
                        Text(item.char)
                            .font(.system(.title, design: .serif))
                        Text(item.pinyin)
                            .font(.caption2)
                            .foregroundStyle(.orange)
                        Text(item.meaning)
                            .font(.caption)
                            .fontWeight(.medium)
                        Text(item.note)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(10)
                    .frame(maxWidth: .infinity)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }
        }
    }

    private var grammarSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Grammar", systemImage: "book.pages")
                .font(.headline)
                .foregroundStyle(.teal)
            ForEach(result.grammar) { gp in
                VStack(alignment: .leading, spacing: 4) {
                    Text(gp.point)
                        .font(.subheadline.weight(.semibold))
                    Text(gp.explanation)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
    }

    private var notesSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Notes", systemImage: "lightbulb")
                .font(.headline)
                .foregroundStyle(.yellow)
            ForEach(Array(result.notes.enumerated()), id: \.offset) { _, note in
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "circle.fill")
                        .font(.system(size: 6))
                        .padding(.top, 6)
                    Text(note)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private var vocabSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Vocabulary", systemImage: "book.closed")
                .font(.headline)
                .foregroundStyle(.indigo)
            ForEach(result.vocab, id: \.hanzi) { word in
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(word.hanzi)
                            .font(.system(.title3, design: .serif))
                        Text(word.pinyin)
                            .font(.caption)
                            .foregroundStyle(.orange)
                        Spacer()
                        if word.alreadyKnown {
                            Image(systemName: "checkmark.seal.fill")
                                .foregroundStyle(.green)
                                .font(.caption)
                        }
                    }
                    Text(word.meaning)
                        .font(.subheadline)
                        .foregroundStyle(.primary)
                    Text(word.example)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .italic()
                    if !word.exampleTranslation.isEmpty {
                        Text(word.exampleTranslation)
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
    }
}