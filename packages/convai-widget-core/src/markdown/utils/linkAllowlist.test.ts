import { describe, expect, it } from "vitest";
import { getAllowedLinkPrefixes, isLinkAllowed } from "./linkAllowlist";

const ORIGIN = "https://shop.acme.example";

const prefixesFor = (allowedHosts: string[]) =>
  getAllowedLinkPrefixes(
    { allowedHosts, includeWww: true, allowHttp: true },
    ORIGIN
  );

describe("isLinkAllowed", () => {
  it.each<{ description: string; hosts: string[]; link: string }>([
    {
      description: "the host page origin with no allowed hosts",
      hosts: [],
      link: "https://shop.acme.example/cart",
    },
    {
      description: "an allowed host",
      hosts: ["acme.example"],
      link: "https://acme.example/docs",
    },
    {
      description: "the www variant of an allowed host",
      hosts: ["acme.example"],
      link: "https://www.acme.example/docs",
    },
    {
      description: "any https link with a wildcard",
      hosts: ["*"],
      link: "https://evil.example/",
    },
  ])("allows $description", ({ hosts, link }) => {
    expect(isLinkAllowed(link, prefixesFor(hosts), ORIGIN)).toBe(true);
  });

  it.each<{ description: string; hosts: string[]; link: string }>([
    {
      description: "another site with no allowed hosts",
      hosts: [],
      link: "https://acme-login.evil.example/",
    },
    {
      description: "a host that is not allowed",
      hosts: ["acme.example"],
      link: "https://evil.example/",
    },
    {
      description: "a host that only starts with an allowed host",
      hosts: ["acme.example"],
      link: "https://acme.example.evil.example/",
    },
    {
      description: "a subdomain of an allowed host",
      hosts: ["acme.example"],
      link: "https://login.acme.example/",
    },
    {
      description: "credentials that make an allowed host look like the target",
      hosts: ["acme.example"],
      link: "https://acme.example@evil.example/",
    },
    {
      description: "a javascript: link even with a wildcard",
      hosts: ["*"],
      link: "javascript:alert(1)",
    },
    {
      description: "an unparseable link",
      hosts: ["*"],
      link: "not a url",
    },
  ])("blocks $description", ({ hosts, link }) => {
    expect(isLinkAllowed(link, prefixesFor(hosts), ORIGIN)).toBe(false);
  });
});
