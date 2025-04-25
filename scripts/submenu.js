class TileSubmenuConfig extends FormApplication {
  constructor(tile) {
    super(tile);
    this.tile = tile;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title: "Tile Submenu Configuration",
      id: "tile-submenu-config",
      template: "modules/tiles-interactive-submenu/templates/config.html",
      width: 600,
      height: "auto",
    });
  }

  getData() {
    return {
      actions: this.tile.document.getFlag("tiles-interactive-submenu", "actions") || []
    };
  }

  async _updateObject(event, formData) {
    const data = expandObject(formData);
    await this.tile.document.setFlag("tiles-interactive-submenu", "actions", data.actions);
  }
}

Hooks.on("ready", () => {
  // Makes submenu available globally for use with tile triggers or macros
  game.tileSubmenu = {
    showMenu: async (token) => {
      const html = await renderTemplate("modules/tile-submenu/templates/submenu.html", {});
      new Dialog({
        title: "Tile Interaction",
        content: html,
        buttons: {},
        render: html => {
          html.find("button").on("click", async (e) => {
            const action = e.currentTarget.dataset.action;
            const actor = token.actor;

            const DC = {
              perception: 14,
              investigation: 15,
              unlock: 16,
              disarm: 17
            };

            switch (action) {
              case "perception":
              case "investigation":
                const skill = action === "perception" ? "per" : "inv";
                const result = await actor.rollSkill(skill);
                ui.notifications.info(`${actor.name} rolled ${result.total} for ${action}`);
                break;

              case "unlock":
              case "disarm":
                if (!actor.items.find(i => i.name.includes("Thieves' Tools"))) {
                  ui.notifications.warn(`${actor.name} has no Thieves' Tools!`);
                  return;
                }
                const toolCheck = await actor.rollSkill("sle");
                ui.notifications.info(`${actor.name} attempts to ${action}, rolled ${toolCheck.total}`);
                break;

              case "attack":
                ChatMessage.create({
                  content: `${actor.name} strikes the object with a melee attack!`
                });
                break;
            }
          });
        }
      }).render(true);
    }
  };

  // Optional: Allow tile click to open the submenu for controlled token
  Hooks.on("clickTile", async (tile, event) => {
    const controlled = canvas.tokens.controlled[0];
    if (controlled) {
      await game.tileSubmenu.showMenu(controlled);
    } else {
      ui.notifications.warn("You must select a token.");
    }
  });
});

// ✅ Inject a new tab into the Tile Config
Hooks.on("renderTileConfig", (app, html, data) => {
  if (!game.user.isGM) return;

  // Add the new tab button to the top
  const tabButton = `<a class="item" data-tab="submenu"><i class="fas fa-tools"></i> Submenu</a>`;
  html.find(".sheet-tabs").append(tabButton);

  // Add the tab content section
  const actions = app.object.getFlag("tiles-interactive-submenu", "actions") || [];
  const submenuHtml = `
    <div class="tab" data-tab="submenu">
      <p>🛠️ Submenu Actions Configured: ${actions.length}</p>
      <button type="button" class="submenu-launch"><i class="fas fa-cog"></i> Open Full Submenu Config</button>
    </div>
  `;
  html.find(".sheet-body").append(submenuHtml);

  // Handle button click to open the full FormApplication
  html.find(".submenu-launch").on("click", () => {
    new TileSubmenuConfig(app.object).render(true);
  });
});
