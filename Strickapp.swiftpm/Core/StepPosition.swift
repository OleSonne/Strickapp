/// Position in einer Anleitung, immer innerhalb der vorhandenen Schritte.
struct StepPosition: Codable, Equatable, Sendable {
    let stepCount: Int
    private(set) var index: Int

    /// Liefert `nil`, wenn es keine Schritte gibt.
    init?(stepCount: Int, index: Int = 0) {
        guard stepCount > 0 else { return nil }
        self.stepCount = stepCount
        self.index = min(max(index, 0), stepCount - 1)
    }

    /// Gespeicherte Daten können beschädigt sein, daher dieselbe Prüfung wie oben.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let count = try container.decode(Int.self, forKey: .stepCount)
        let index = try container.decode(Int.self, forKey: .index)
        guard let position = StepPosition(stepCount: count, index: index) else {
            throw DecodingError.dataCorruptedError(
                forKey: .stepCount, in: container,
                debugDescription: "stepCount must be positive"
            )
        }
        self = position
    }

    var isFirst: Bool { index == 0 }
    var isLast: Bool { index == stepCount - 1 }

    mutating func advance() {
        if !isLast { index += 1 }
    }

    mutating func goBack() {
        if !isFirst { index -= 1 }
    }
}
