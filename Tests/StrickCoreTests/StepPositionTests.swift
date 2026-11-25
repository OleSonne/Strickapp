import Foundation
import Testing
@testable import StrickCore

@Suite struct StepPositionTests {
    @Test func rejectsEmptyPattern() {
        #expect(StepPosition(stepCount: 0) == nil)
    }

    @Test func clampsIndex() throws {
        #expect(try #require(StepPosition(stepCount: 3, index: 9)).index == 2)
        #expect(try #require(StepPosition(stepCount: 3, index: -1)).index == 0)
    }

    @Test func staysWithinBounds() throws {
        var position = try #require(StepPosition(stepCount: 2))
        position.goBack()
        #expect(position.isFirst)
        position.advance()
        position.advance()
        #expect(position.isLast)
        #expect(position.index == 1)
        position.goBack()
        #expect(position.index == 0)
    }

    @Test func survivesSaving() throws {
        let position = try #require(StepPosition(stepCount: 5, index: 3))
        let data = try JSONEncoder().encode(position)
        #expect(try JSONDecoder().decode(StepPosition.self, from: data) == position)
    }

    @Test func rejectsCorruptData() {
        let data = Data(#"{"stepCount":0,"index":0}"#.utf8)
        #expect(throws: DecodingError.self) {
            try JSONDecoder().decode(StepPosition.self, from: data)
        }
    }
}
