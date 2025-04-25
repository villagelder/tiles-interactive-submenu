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

Hooks.on("renderTileConfig", (app, html, data) => {
  if (!game.user.isGM) return;

  // Create a unique tab ID
  const tabId = "ve-submenu";

  // Add a new tab button at the top (next to Basic, Overhead, Triggers)
  const newTabButton = $(`<a class="item" data-tab="${tabId}"><i class="fas fa-tools"></i>Interactive</a>`);
  html.find('.sheet-tabs').first().append(newTabButton);

  // Add the tab content container
  const newTabContent = $(`
    <div class="tab" data-tab="${tabId}">
      <div class="form-group">
        <h2>Tile Interactions</h2>
        <p>Manage the interactions players can perform on this tile.</p>
  
        <div id="ve-interactions-list">
          <p>No interactions configured yet.</p>
        </div>
  
        <button type="button" class="ve-add-interaction">
          <i class="fas fa-plus"></i>Add Interaction
        </button>
      </div>
    </div>

  `);
  html.find('.sheet-body').first().append(newTabContent);

  // Activate button click
  html.find(".submenu-launch").on("click", () => {
    new TileSubmenuConfig(app.object).render(true);
  });

  // Register the new tab with Foundry's Tabs controller manually
  const tabs = app._tabs[0]; // Grab the first tab controller for TileConfig
  tabs.registerTab(tabId);
});
