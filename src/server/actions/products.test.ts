import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { auth } from "@/lib/auth";
import {
  createProductAction,
  deleteProductAction,
  moveProductDownAction,
  moveProductUpAction,
  reorderProductsAction,
  updateProductAction,
} from "@/server/actions/products";
import {
  createProduct,
  deleteProduct,
  getProductsByLiveIdForUser,
  reorderProducts,
  updateProduct,
} from "@/server/db/queries/products";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/db/queries/products", () => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  reorderProducts: vi.fn(),
  getProductsByLiveIdForUser: vi.fn(),
}));

const authMock = auth as unknown as Mock;
const USER_ID = "11111111-1111-4111-a111-111111111111";
const LIVE_ID = "22222222-2222-4222-a222-222222222222";
const PRODUCT_ID = "33333333-3333-4333-a333-333333333333";
const OTHER_PRODUCT_ID = "44444444-4444-4444-a444-444444444444";

function signedIn(userId = USER_ID) {
  authMock.mockResolvedValue({ user: { id: userId }, expires: "" });
}

const validInput = {
  name: "Jaqueta jeans oversized",
  category: "Jaquetas",
  size: "M",
  color: "Azul claro",
  imageUrl: "https://exemplo.com/imagem.jpg",
  productUrl: "https://loja.com/produto",
  price: "199,90",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createProductAction", () => {
  it("rejects when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const result = await createProductAction(LIVE_ID, validInput);

    expect(result.success).toBe(false);
    expect(createProduct).not.toHaveBeenCalled();
  });

  it("creates a product scoping the query to the session user", async () => {
    signedIn();
    vi.mocked(createProduct).mockResolvedValue({ id: PRODUCT_ID } as never);

    const result = await createProductAction(LIVE_ID, validInput);

    expect(result.success).toBe(true);
    const [liveId, userId, data] = vi.mocked(createProduct).mock.calls[0];
    expect(liveId).toBe(LIVE_ID);
    expect(userId).toBe(USER_ID);
    expect(data.price).toBe("199.90");
  });

  it("ignores client-supplied position and userId", async () => {
    signedIn();
    vi.mocked(createProduct).mockResolvedValue({ id: PRODUCT_ID } as never);

    // Attacker-supplied fields the form should never be able to set.
    const payload = { ...validInput, position: 99, userId: "attacker" };
    await createProductAction(LIVE_ID, payload);

    const [, userId, data] = vi.mocked(createProduct).mock.calls[0];
    expect(userId).toBe(USER_ID);
    expect(data).not.toHaveProperty("position");
    expect(data).not.toHaveProperty("userId");
  });

  it("returns not found when the live is not owned", async () => {
    signedIn();
    vi.mocked(createProduct).mockResolvedValue(null);

    const result = await createProductAction(LIVE_ID, validInput);

    expect(result.success).toBe(false);
  });

  it("returns field errors for an invalid payload", async () => {
    signedIn();

    const result = await createProductAction(LIVE_ID, {
      ...validInput,
      imageUrl: "javascript:alert(1)",
    });

    expect(result.success).toBe(false);
    expect(createProduct).not.toHaveBeenCalled();
  });
});

describe("updateProductAction", () => {
  it("updates scoped to the live and owner", async () => {
    signedIn();
    vi.mocked(updateProduct).mockResolvedValue({ id: PRODUCT_ID } as never);

    const result = await updateProductAction(LIVE_ID, PRODUCT_ID, validInput);

    expect(result.success).toBe(true);
    const [productId, liveId, userId] = vi.mocked(updateProduct).mock.calls[0];
    expect(productId).toBe(PRODUCT_ID);
    expect(liveId).toBe(LIVE_ID);
    expect(userId).toBe(USER_ID);
  });

  it("returns not found when nothing matched the owner", async () => {
    signedIn();
    vi.mocked(updateProduct).mockResolvedValue(null);

    const result = await updateProductAction(LIVE_ID, PRODUCT_ID, validInput);

    expect(result.success).toBe(false);
  });
});

describe("deleteProductAction", () => {
  it("deletes scoped to the live and owner", async () => {
    signedIn();
    vi.mocked(deleteProduct).mockResolvedValue({ id: PRODUCT_ID });

    const result = await deleteProductAction(LIVE_ID, PRODUCT_ID);

    expect(result.success).toBe(true);
    expect(deleteProduct).toHaveBeenCalledWith(PRODUCT_ID, LIVE_ID, USER_ID);
  });

  it("rejects an unauthenticated delete", async () => {
    authMock.mockResolvedValue(null);

    const result = await deleteProductAction(LIVE_ID, PRODUCT_ID);

    expect(result.success).toBe(false);
    expect(deleteProduct).not.toHaveBeenCalled();
  });
});

describe("reorderProductsAction", () => {
  it("persists a valid order scoped to the owner", async () => {
    signedIn();
    vi.mocked(reorderProducts).mockResolvedValue({ ok: true });

    const result = await reorderProductsAction(LIVE_ID, [
      PRODUCT_ID,
      OTHER_PRODUCT_ID,
    ]);

    expect(result.success).toBe(true);
    expect(reorderProducts).toHaveBeenCalledWith(LIVE_ID, USER_ID, [
      PRODUCT_ID,
      OTHER_PRODUCT_ID,
    ]);
  });

  it("rejects a manipulated payload (non-uuid ids)", async () => {
    signedIn();

    const result = await reorderProductsAction(LIVE_ID, ["not-a-uuid"]);

    expect(result.success).toBe(false);
    expect(reorderProducts).not.toHaveBeenCalled();
  });

  it("surfaces a rejected order from the query layer", async () => {
    signedIn();
    vi.mocked(reorderProducts).mockResolvedValue({ ok: false });

    const result = await reorderProductsAction(LIVE_ID, [PRODUCT_ID]);

    expect(result.success).toBe(false);
  });
});

describe("moveProductUpAction / moveProductDownAction", () => {
  function mockOrder(ids: string[]) {
    vi.mocked(getProductsByLiveIdForUser).mockResolvedValue(
      ids.map((id) => ({ id })) as never,
    );
  }

  it("moves a product up by swapping with its predecessor", async () => {
    signedIn();
    mockOrder([PRODUCT_ID, OTHER_PRODUCT_ID]);
    vi.mocked(reorderProducts).mockResolvedValue({ ok: true });

    const result = await moveProductUpAction(LIVE_ID, OTHER_PRODUCT_ID);

    expect(result.success).toBe(true);
    expect(reorderProducts).toHaveBeenCalledWith(LIVE_ID, USER_ID, [
      OTHER_PRODUCT_ID,
      PRODUCT_ID,
    ]);
  });

  it("is a no-op when already at the top", async () => {
    signedIn();
    mockOrder([PRODUCT_ID, OTHER_PRODUCT_ID]);

    const result = await moveProductUpAction(LIVE_ID, PRODUCT_ID);

    expect(result.success).toBe(true);
    expect(reorderProducts).not.toHaveBeenCalled();
  });

  it("moves a product down by swapping with its successor", async () => {
    signedIn();
    mockOrder([PRODUCT_ID, OTHER_PRODUCT_ID]);
    vi.mocked(reorderProducts).mockResolvedValue({ ok: true });

    const result = await moveProductDownAction(LIVE_ID, PRODUCT_ID);

    expect(result.success).toBe(true);
    expect(reorderProducts).toHaveBeenCalledWith(LIVE_ID, USER_ID, [
      OTHER_PRODUCT_ID,
      PRODUCT_ID,
    ]);
  });

  it("returns not found when the product is not in the live", async () => {
    signedIn();
    mockOrder([PRODUCT_ID]);

    const result = await moveProductUpAction(LIVE_ID, OTHER_PRODUCT_ID);

    expect(result.success).toBe(false);
    expect(reorderProducts).not.toHaveBeenCalled();
  });
});
