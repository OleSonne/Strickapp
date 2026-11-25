import SwiftUI

struct StepEditorView: View {
    @Environment(\.dismiss) private var dismiss
    private let title: String
    private let hint: String?
    private let onSave: (String) throws -> Void

    @State private var text: String
    @State private var errorMessage: String?

    init(
        title: String,
        hint: String? = nil,
        text: String = "",
        onSave: @escaping (String) throws -> Void
    ) {
        self.title = title
        self.hint = hint
        self.onSave = onSave
        _text = State(initialValue: text)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextEditor(text: $text)
                        .frame(minHeight: 200)
                        .accessibilityLabel("Text")
                } footer: {
                    if let hint { Text(hint) }
                }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Abbrechen") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Sichern", action: save)
                        .disabled(StepText.split(text).isEmpty)
                }
            }
            .errorAlert($errorMessage)
        }
        // Verhindert, dass eine Wischgeste getippten Text verwirft.
        .interactiveDismissDisabled(!text.isEmpty)
    }

    private func save() {
        do {
            try onSave(text)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
