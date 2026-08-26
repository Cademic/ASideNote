import { describe, expect, it } from "vitest";
import {
  corkPanToCenterWorldPoint,
  corkScreenToWorld,
  corkWorldToScreen,
  screenDeltaToWorldDelta,
} from "./boardViewportMath";

describe("boardViewportMath", () => {
  const zooms = [0.25, 0.5, 1, 1.5, 2.0];
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
  const worldPoints = [
    { x: 0, y: 0 },
    { x: 400, y: 300 },
    { x: -820, y: 1540 },
  ];

  it("round-trips world -> screen -> world for every zoom/pan/contentMin/point combination", () => {
    for (const zoom of zooms) {
      for (const { panX, panY } of pans) {
        for (const { contentMinX, contentMinY } of contentMins) {
          for (const { x, y } of worldPoints) {
            const screen = corkWorldToScreen(x, y, zoom, panX, panY, contentMinX, contentMinY);
            const world = corkScreenToWorld(
              screen.x,
              screen.y,
              zoom,
              panX,
              panY,
              contentMinX,
              contentMinY,
            );
            expect(world.x).toBeCloseTo(x, 6);
            expect(world.y).toBeCloseTo(y, 6);
          }
        }
      }
    }
  });

  it("corkPanToCenterWorldPoint centers the target world point on screen", () => {
    const zoom = 1.5;
    const contentMinX = -250;
    const contentMinY = 500;
    const centerScreenX = 640;
    const centerScreenY = 360;
    const targetWorldX = 800;
    const targetWorldY = -200;

    const { x: panX, y: panY } = corkPanToCenterWorldPoint(
      centerScreenX,
      centerScreenY,
      targetWorldX,
      targetWorldY,
      zoom,
      contentMinX,
      contentMinY,
    );

    const world = corkScreenToWorld(
      centerScreenX,
      centerScreenY,
      zoom,
      panX,
      panY,
      contentMinX,
      contentMinY,
    );
    expect(world.x).toBeCloseTo(targetWorldX, 6);
    expect(world.y).toBeCloseTo(targetWorldY, 6);
  });

  it("screenDeltaToWorldDelta matches the delta of corkScreenToWorld at a fixed zoom", () => {
    const screenX = 250;
    const screenY = 180;
    const dx = 37;
    const dy = -52;

    for (const zoom of zooms) {
      for (const { panX, panY } of pans) {
        for (const { contentMinX, contentMinY } of contentMins) {
          const before = corkScreenToWorld(screenX, screenY, zoom, panX, panY, contentMinX, contentMinY);
          const after = corkScreenToWorld(screenX + dx, screenY + dy, zoom, panX, panY, contentMinX, contentMinY);
          const delta = screenDeltaToWorldDelta(dx, dy, zoom);

          expect(delta.x).toBeCloseTo(after.x - before.x, 6);
          expect(delta.y).toBeCloseTo(after.y - before.y, 6);
        }
      }
    }
  });
});
