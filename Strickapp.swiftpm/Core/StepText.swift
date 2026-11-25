import Foundation

enum StepText {
    /// Eine Zeile wird ein Schritt, leere Zeilen entfallen.
    static func split(_ text: String) -> [String] {
        text.split(whereSeparator: \.isNewline)
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
    }
}
