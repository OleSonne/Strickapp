/// Fortschritt in einem Projekt. Die Werte bleiben immer im gültigen Bereich.
struct StepProgress: Equatable, Sendable {
    let stepCount: Int
    private(set) var completedCount: Int

    init(stepCount: Int, completedCount: Int) {
        self.stepCount = max(stepCount, 0)
        self.completedCount = min(max(completedCount, 0), self.stepCount)
    }

    /// `nil`, wenn es keine Schritte gibt oder alle erledigt sind.
    var currentIndex: Int? {
        completedCount < stepCount ? completedCount : nil
    }

    var isFinished: Bool { stepCount > 0 && completedCount == stepCount }

    var fraction: Double {
        stepCount == 0 ? 0 : Double(completedCount) / Double(stepCount)
    }

    var canGoBack: Bool { completedCount > 0 }
    var canAdvance: Bool { currentIndex != nil }

    mutating func advance() {
        if canAdvance { completedCount += 1 }
    }

    mutating func goBack() {
        if canGoBack { completedCount -= 1 }
    }

    /// Fortschritt nach Löschen oder Umsortieren. Der aktuelle Schritt bleibt aktuell;
    /// wurde er gelöscht, rückt der nächste noch vorhandene Schritt nach.
    func relocated<ID: Hashable>(from oldIDs: [ID], to newIDs: [ID]) -> StepProgress {
        let pending = oldIDs.dropFirst(completedCount)
        for id in pending {
            if let index = newIDs.firstIndex(of: id) {
                return StepProgress(stepCount: newIDs.count, completedCount: index)
            }
        }
        return StepProgress(stepCount: newIDs.count, completedCount: newIDs.count)
    }
}
