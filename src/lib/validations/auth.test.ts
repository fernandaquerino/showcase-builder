import { describe, expect, it } from "vitest";

import { loginSchema, signupSchema } from "./auth";

const validSignup = {
  name: "Fernanda Lima",
  email: "fernanda@example.com",
  handle: "fernanda-lima",
  password: "senha123",
  passwordConfirmation: "senha123",
};

describe("signupSchema", () => {
  it("accepts a valid signup", () => {
    expect(signupSchema.safeParse(validSignup).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(
      signupSchema.safeParse({ ...validSignup, email: "invalid" }).success,
    ).toBe(false);
  });

  it("rejects an invalid handle", () => {
    expect(
      signupSchema.safeParse({ ...validSignup, handle: "ab" }).success,
    ).toBe(false);
  });

  it("rejects a weak password", () => {
    expect(
      signupSchema.safeParse({
        ...validSignup,
        password: "abcdefgh",
        passwordConfirmation: "abcdefgh",
      }).success,
    ).toBe(false);
  });

  it("rejects a different password confirmation", () => {
    expect(
      signupSchema.safeParse({
        ...validSignup,
        passwordConfirmation: "different123",
      }).success,
    ).toBe(false);
  });

  it("normalizes email, handle and surrounding spaces", () => {
    const result = signupSchema.parse({
      ...validSignup,
      name: "  Fernanda Lima  ",
      email: "  FERNANDA@EXAMPLE.COM ",
      handle: " Fernánda Lima ",
    });

    expect(result).toMatchObject({
      name: "Fernanda Lima",
      email: "fernanda@example.com",
      handle: "fernanda-lima",
    });
  });
});

describe("loginSchema", () => {
  it("accepts and normalizes a valid payload", () => {
    expect(
      loginSchema.parse({
        email: "  FERNANDA@EXAMPLE.COM ",
        password: "senha123",
      }),
    ).toEqual({
      email: "fernanda@example.com",
      password: "senha123",
    });
  });

  it("rejects an invalid email", () => {
    expect(
      loginSchema.safeParse({ email: "invalid", password: "senha123" }).success,
    ).toBe(false);
  });

  it("rejects an empty password", () => {
    expect(
      loginSchema.safeParse({
        email: "fernanda@example.com",
        password: "",
      }).success,
    ).toBe(false);
  });
});
