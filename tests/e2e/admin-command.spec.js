import { expect, test } from "@playwright/test";

const mountCommandHarness = async (page) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const { default: React } = await import(
      "/node_modules/.vite/deps/react.js"
    );
    const { default: ReactDOM } = await import(
      "/node_modules/.vite/deps/react-dom_client.js"
    );
    const { AdminCommandProvider, useAdminCommand } = await import(
      "/src/admin/AdminCommandContext.jsx"
    );

    Object.assign(window, { commandCalls: 0, reconciliationReads: 0 });
    function Controls() {
      const { isPending, runCommand } = useAdminCommand();
      const execute = (outcome, confirmation, reconcile) =>
        runCommand({
          key: "registro",
          command: async () => {
            window.commandCalls += 1;
            if (outcome === "pending")
              return new Promise((resolve) => {
                window.finishCommand = () =>
                  resolve({ outcome: "confirmed", value: null });
              });
            return outcome;
          },
          confirmation,
          reconcile,
          messages: {
            confirmed: "El cambio quedó confirmado.",
            rejected: "El cambio fue rechazado.",
            unknown: "No pudimos confirmar el cambio.",
          },
        });

      return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          "button",
          {
            disabled: isPending("registro"),
            onClick: () => execute("pending"),
          },
          isPending("registro") ? "Guardando…" : "Guardar",
        ),
        React.createElement(
          "button",
          { disabled: isPending("otro") },
          "Otra acción",
        ),
        React.createElement(
          "button",
          {
            onClick: () =>
              execute(
                { outcome: "confirmed", value: null },
                {
                  title: "Eliminar registro",
                  description: "Esta acción no se puede deshacer.",
                  confirmLabel: "Sí, eliminar",
                },
              ),
          },
          "Eliminar",
        ),
        React.createElement(
          "button",
          {
            onClick: () =>
              execute({ outcome: "rejected", code: "REVISION_CONFLICT" }),
          },
          "Guardar rechazado",
        ),
        React.createElement(
          "button",
          {
            onClick: () =>
              execute(
                { outcome: "unknown", code: "RESULT_UNVERIFIABLE" },
                null,
                async () => (window.reconciliationReads += 1),
              ),
          },
          "Guardar con resultado incierto",
        ),
      );
    }

    const root = document.createElement("div");
    document.body.replaceChildren(root);
    ReactDOM.createRoot(root).render(
      React.createElement(
        AdminCommandProvider,
        null,
        React.createElement(Controls),
      ),
    );
  });
};

test("keeps pending state scoped and prevents a duplicate command", async ({
  page,
}) => {
  await mountCommandHarness(page);
  const save = page.getByRole("button", { name: "Guardar", exact: true });

  await save.dblclick();
  await expect(page.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Otra acción" })).toBeEnabled();
  await expect.poll(() => page.evaluate(() => window.commandCalls)).toBe(1);
  await page.evaluate(() => window.finishCommand());
  await expect(page.getByRole("status")).toContainText(
    "El cambio quedó confirmado.",
  );
});

test("requires confirmation, supports Escape, and returns focus", async ({
  page,
}) => {
  await mountCommandHarness(page);
  const remove = page.getByRole("button", { name: "Eliminar" });

  await remove.click();
  await expect(
    page.getByRole("dialog", { name: "Eliminar registro" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Sí, eliminar" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(remove).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.commandCalls)).toBe(0);

  await remove.click();
  await page.getByRole("button", { name: "Sí, eliminar" }).click();
  await expect(page.getByRole("status")).toContainText(
    "El cambio quedó confirmado.",
  );
  await expect(remove).toBeFocused();
});

test("announces rejected and unknown outcomes truthfully", async ({ page }) => {
  await mountCommandHarness(page);
  const alert = page.getByRole("alert");
  await page.getByRole("button", { name: "Guardar rechazado" }).click();
  await expect(alert).toContainText("El cambio fue rechazado.");

  await page
    .getByRole("button", { name: "Guardar con resultado incierto" })
    .click();
  await expect(alert).toContainText("No pudimos confirmar el cambio.");
  await expect(alert).toContainText("No repitas la acción");
  await expect(page.getByRole("button", { name: /reintentar/i })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Verificar estado" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => window.reconciliationReads))
    .toBe(1);
  await expect.poll(() => page.evaluate(() => window.commandCalls)).toBe(2);
});
