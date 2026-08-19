import { describe, it } from "node:test";
import assert from "node:assert";
import { segmentJourney } from "../server/engine/journeySegmenter.js";
import { DEFAULT_STOPS, DEFAULT_TRAVELER } from "../server/data/defaultJourney.js";

describe("Segmentation Engine Tests", () => {
  it("converts stops into sequential segments", () => {
    const segments = segmentJourney(DEFAULT_STOPS, DEFAULT_TRAVELER);
    assert.strictEqual(segments.length, DEFAULT_STOPS.length - 1);
    
    // Check S1
    assert.strictEqual(segments[0].id, "S1");
    assert.strictEqual(segments[0].origin, DEFAULT_STOPS[0].name);
    assert.strictEqual(segments[0].destination, DEFAULT_STOPS[1].name);

    // Check S3 hero segment
    assert.strictEqual(segments[2].id, "S3");
    assert.strictEqual(segments[2].origin, "Panjim Promenade & Fontainhas");
    assert.strictEqual(segments[2].destination, "Fort Aguada");
    assert.strictEqual(segments[2].candidateRoutes.length, 3);
  });

  it("assigns candidate routes A, B, and C with valid scoring", () => {
    const segments = segmentJourney(DEFAULT_STOPS, DEFAULT_TRAVELER);
    const s3 = segments.find(s => s.id === "S3");
    
    assert.ok(s3);
    assert.strictEqual(s3.candidateRoutes.length, 3);
    const recRoute = s3.candidateRoutes.find(r => r.isRecommended);
    assert.ok(recRoute);
    assert.strictEqual(recRoute.id, "B", "Initially Route B should be recommended for wheelchair user");
    assert.strictEqual(recRoute.score >= 90, true);
  });
});
