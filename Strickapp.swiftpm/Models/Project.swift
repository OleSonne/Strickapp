import Foundation
import SwiftData

@Model
final class Project {
    var name: String
    var createdAt: Date
    var updatedAt: Date
    var completedStepCount: Int

    @Relationship(deleteRule: .cascade, inverse: \ProjectStep.project)
    var steps: [ProjectStep] = []

    init(name: String, now: Date = .now) {
        self.name = name
        self.createdAt = now
        self.updatedAt = now
        self.completedStepCount = 0
    }

    /// SwiftData garantiert keine Reihenfolge in Beziehungen.
    var orderedSteps: [ProjectStep] {
        steps.sorted { $0.order < $1.order }
    }

    var progress: StepProgress {
        StepProgress(stepCount: steps.count, completedCount: completedStepCount)
    }
}

@Model
final class ProjectStep {
    var identifier: UUID
    var text: String
    var order: Int
    var project: Project?

    init(text: String, order: Int) {
        self.identifier = UUID()
        self.text = text
        self.order = order
    }
}
