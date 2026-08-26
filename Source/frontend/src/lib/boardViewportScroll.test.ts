import { describe, expect, it } from "vitest";
import { corkScreenToWorld } from "./boardViewportMath";
import { corkZoomAroundScreenPoint } from "./boardViewportScroll";

describe("boardViewportScroll", () => {
  const zoomPairs = [
    { zoom: 1, newZoom: 1.5 },
    { zoom: 1, newZoom: 0.5 },
    { zoom: 0.25, newZoom: 2.0 },
    { zoom: 2.0, newZoom: 0.25 },
  ];
  const pans = [
    { panX: 0, panY: 0 },
    { panX: 120, panY: -75 },
    { panX: -400, panY: 300 },
  ];
  const contentMins = [
    { contentMinX: 0, contentMinY: 0 },
    { contentMinX: -250, contentMinY: 500 },
    { contentMinX: 1000, contentMinY: -1000 },
  ];
  const screenPoints = [
    { screenX: 0, screenY: 0 },
    { screenX: 640, screenY: 360 },
    { screenX: -120, screenY: 900 },
  ];

  it("keeps the board point under the screen point fixed across a zoom change", () => {
    for (const { zoom, newZoom } of zoomPairs) {
      for (const { panX, panY } of pans) {
        for (const { contentMinX, contentMinY } of contentMins) {
          for (const { screenX, screenY } of screenPoints) {
            const before = corkScreenToWorld(screenX, screenY, zoom, panX, panY, contentMinX, contentMinY);
            const { panX: newPanX, panY: newPanY } = corkZoomAroundScreenPoint(
              panX,
              panY,
              zoom,
              newZoom,
              screenX,
              screenY,
              contentMinX,
              contentMinY,
            );
            const after = corkScreenToWorld(screenX, screenY, newZoom, newPanX, newPanY, contentMinX, contentMinY);

            expect(after.x).toBeCloseTo(before.x, 6);
            expect(after.y).toBeCloseTo(before.y, 6);
          }
        }
      }
    }
  });
});
