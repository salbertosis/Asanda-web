import { expect, test } from "@playwright/test";

const userId = "10000000-0000-4000-8000-000000000004";
const accessToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ exp: 4102444800, sub: userId, role: "authenticated" })).toString("base64url")}.signature`;
const authUser = {
  id: userId,
  aud: "authenticated",
  role: "authenticated",
  email: "editor@asanda.test",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  created_at: "2026-08-17T00:00:00.000Z",
  updated_at: "2026-08-17T00:00:00.000Z",
  is_anonymous: false,
};

const json = (body, status = 200) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

const routeAdmin = async (page) => {
  await page.route("**/rest/v1/**", (route) => route.fulfill(json([])));
  await page.route("**/rest/v1/profiles**", (route) =>
    route.fulfill(
      json({
        id: userId,
        display_name: "Editor ASANDA",
        role: "editor",
        is_active: true,
      }),
    ),
  );
  await page.route("**/auth/v1/token**", (route) =>
    route.fulfill(
      json({
        access_token: accessToken,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: 4102444800,
        refresh_token: "refresh-token",
        user: authUser,
      }),
    ),
  );
  await page.route("**/auth/v1/user", (route) => route.fulfill(json(authUser)));
  await page.route("**/auth/v1/logout**", (route) =>
    route.fulfill({ status: 204, body: "" }),
  );
};

const signIn = async (page) => {
  await page.goto("/admin/login");
  await page.getByLabel("Correo electrónico").fill(authUser.email);
  await page.getByLabel("Contraseña").fill("not-a-real-password");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/admin\/noticias$/);
};

test.beforeEach(async ({ page }) => {
  await routeAdmin(page);
});

test("keeps one main landmark and moves keyboard focus for skips and route changes", async ({
  page,
}) => {
  await signIn(page);
  const main = page.getByRole("main");
  await expect(main).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Noticias" })).toBeFocused();

  const skip = page.getByRole("link", {
    name: "Saltar al contenido principal",
  });
  await skip.focus();
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(main).toBeFocused();

  const athletes = page.getByRole("link", { name: "Atletas" });
  await athletes.click();
  await expect(athletes).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Atletas" })).toBeFocused();
});

test("uses system theme until an explicit keyboard choice is persisted", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await signIn(page);

  const theme = page.getByRole("button", { name: "Activar modo claro" });
  await expect(page.locator("html")).toHaveClass(/dark/);
  await theme.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("darkMode")))
    .toBe("false");

  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(
    page.getByRole("button", { name: "Activar modo oscuro" }),
  ).toBeVisible();
});

test("contains navigation overflow and keeps controls usable at narrow widths", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 720 });
  await signIn(page);

  const theme = page.getByRole("button", { name: /Activar modo/ });
  await expect
    .poll(() =>
      theme.evaluate(
        (control) => getComputedStyle(control).transitionProperty === "none",
      ),
    )
    .toBe(true);

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 720 });
    const dimensions = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      navClient: document.querySelector("[data-admin-nav]").clientWidth,
      navScroll: document.querySelector("[data-admin-nav]").scrollWidth,
    }));
    expect(dimensions.page).toBeLessThanOrEqual(width);
    expect(dimensions.navScroll).toBeGreaterThan(dimensions.navClient);

    const controls = [
      theme,
      page.getByRole("button", { name: "Cerrar sesión" }),
      ...(await page
        .getByRole("navigation", { name: "Módulos de administración" })
        .getByRole("link")
        .all()),
    ];
    for (const control of controls) {
      const box = await control.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  }
});
