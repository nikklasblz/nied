import { describe, expect, test } from "bun:test";
import { toEmbedUrl } from "../content/parser";

describe("toEmbedUrl", () => {
  test("youtube watch URL -> embed", () => {
    expect(toEmbedUrl("https://www.youtube.com/watch?v=w7UY8gi29fk")).toBe(
      "https://www.youtube.com/embed/w7UY8gi29fk"
    );
  });

  test("watch URL with extra params -> embed (id extracted)", () => {
    expect(toEmbedUrl("https://www.youtube.com/watch?t=10&v=Rf-fIpB4D50")).toBe(
      "https://www.youtube.com/embed/Rf-fIpB4D50"
    );
  });

  test("youtu.be short URL -> embed", () => {
    expect(toEmbedUrl("https://youtu.be/w7UY8gi29fk")).toBe(
      "https://www.youtube.com/embed/w7UY8gi29fk"
    );
  });

  test("shorts URL -> embed", () => {
    expect(toEmbedUrl("https://www.youtube.com/shorts/w7UY8gi29fk")).toBe(
      "https://www.youtube.com/embed/w7UY8gi29fk"
    );
  });

  test("already-embed URL unchanged", () => {
    expect(toEmbedUrl("https://www.youtube.com/embed/w7UY8gi29fk")).toBe(
      "https://www.youtube.com/embed/w7UY8gi29fk"
    );
  });

  test("non-youtube URL unchanged", () => {
    expect(toEmbedUrl("https://player.vimeo.com/video/12345")).toBe(
      "https://player.vimeo.com/video/12345"
    );
  });
});
