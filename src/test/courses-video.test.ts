// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { parseVimeoUrl, parseYouTubeUrl, buildEmbedUrl } from "@/lib/courses";

describe("parseVimeoUrl", () => {
  it("parses a public link without hash", () => {
    expect(parseVimeoUrl("https://vimeo.com/123456789")).toEqual({ videoId: "123456789", hash: null });
  });

  it("parses an unlisted link with the privacy hash as second segment", () => {
    expect(parseVimeoUrl("https://vimeo.com/123456789/a1b2c3d4")).toEqual({
      videoId: "123456789",
      hash: "a1b2c3d4",
    });
  });

  it("parses a player.vimeo.com link", () => {
    expect(parseVimeoUrl("https://player.vimeo.com/video/123456789")).toEqual({
      videoId: "123456789",
      hash: null,
    });
  });

  it("parses a player.vimeo.com link with ?h= hash", () => {
    expect(parseVimeoUrl("https://player.vimeo.com/video/123456789?h=a1b2c3d4")).toEqual({
      videoId: "123456789",
      hash: "a1b2c3d4",
    });
  });

  it("parses a Vimeo dashboard (manage) link", () => {
    expect(parseVimeoUrl("https://vimeo.com/manage/videos/123456789")).toEqual({
      videoId: "123456789",
      hash: null,
    });
  });

  it("accepts www. and ignores irrelevant query/fragment", () => {
    expect(parseVimeoUrl("https://www.vimeo.com/123456789?foo=bar#section")).toEqual({
      videoId: "123456789",
      hash: null,
    });
  });

  it("rejects a non-numeric path (user page)", () => {
    expect(parseVimeoUrl("https://vimeo.com/usuario")).toBeNull();
  });

  it("rejects a hash with invalid characters", () => {
    expect(parseVimeoUrl("https://vimeo.com/123456789/ZZZZZZZZ")).toBeNull();
  });

  it("rejects a non-numeric video id", () => {
    expect(parseVimeoUrl("https://vimeo.com/abcdefgh")).toBeNull();
  });

  it("rejects http:// (non-https)", () => {
    expect(parseVimeoUrl("http://vimeo.com/123456789")).toBeNull();
  });

  it("rejects URLs containing markup", () => {
    expect(parseVimeoUrl('https://vimeo.com/123456789<iframe src="x">')).toBeNull();
  });
});

describe("buildEmbedUrl (Vimeo)", () => {
  it("builds a public embed url with dnt=1", () => {
    expect(buildEmbedUrl("https://vimeo.com/123456789")).toEqual({
      provider: "vimeo",
      embedUrl: "https://player.vimeo.com/video/123456789?dnt=1",
    });
  });

  it("builds an unlisted embed url with ?h= and dnt=1", () => {
    expect(buildEmbedUrl("https://vimeo.com/123456789/a1b2c3d4")).toEqual({
      provider: "vimeo",
      embedUrl: "https://player.vimeo.com/video/123456789?h=a1b2c3d4&dnt=1",
    });
  });

  it("builds embed url from a player.vimeo.com link with hash", () => {
    expect(buildEmbedUrl("https://player.vimeo.com/video/123456789?h=a1b2c3d4")).toEqual({
      provider: "vimeo",
      embedUrl: "https://player.vimeo.com/video/123456789?h=a1b2c3d4&dnt=1",
    });
  });
});

describe("parseYouTubeUrl (retrocompatibilidade)", () => {
  it("parses a watch?v= link", () => {
    const parsed = parseYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(parsed?.videoId).toBe("dQw4w9WgXcQ");
    expect(parsed?.embedUrl).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("parses a youtu.be short link", () => {
    const parsed = parseYouTubeUrl("https://youtu.be/dQw4w9WgXcQ");
    expect(parsed?.videoId).toBe("dQw4w9WgXcQ");
  });

  it("parses an /embed/ link", () => {
    const parsed = parseYouTubeUrl("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(parsed?.videoId).toBe("dQw4w9WgXcQ");
  });
});

describe("buildEmbedUrl (YouTube retrocompatibilidade)", () => {
  it("still builds a YouTube embed url", () => {
    const result = buildEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result.provider).toBe("youtube");
    expect(result.embedUrl).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });
});
