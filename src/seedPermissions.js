const sequelize = require("./config/dbConnection");
const { Role, Permission, RolePermission } = require("./app/role/roleModel");
const bcrypt = require("bcryptjs");
const User = require("./app/user/userModel");

const permissionsData = [
  // Section 1: Master data
  { moduleName: "Master data", moduleCode: "VENDORS", name: "Vendors" },
  { moduleName: "Master data", moduleCode: "CUSTOMERS", name: "Customers" },
  { moduleName: "Master data", moduleCode: "HUBS_REGIONS", name: "Hubs & regions" },
  { moduleName: "Master data", moduleCode: "ITEMS_KITS", name: "Items & kits" },

  // Section 2: Procurement
  { moduleName: "Procurement", moduleCode: "PURCHASE_ORDERS", name: "Purchase orders" },
  { moduleName: "Procurement", moduleCode: "INWARD_GRN", name: "Inward (GRN)" },

  // Section 3: Distribution
  { moduleName: "Distribution", moduleCode: "STOCK_TRANSFERS", name: "Stock transfers" },
  { moduleName: "Distribution", moduleCode: "CUSTOMER_DISPATCH", name: "Customer dispatch" },
  { moduleName: "Distribution", moduleCode: "DELIVERY_CHALLANS", name: "Delivery challans" },

  // Section 4: Control
  { moduleName: "Control", moduleCode: "INVENTORY_REPORTS", name: "Inventory & reports" },
  { moduleName: "Control", moduleCode: "USERS_ROLES", name: "Users & roles" },
];

const actions = ["VIEW", "CREATE", "EDIT", "DELETE"];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully.");

    await sequelize.sync();

    // 1. Seed Permissions Catalog
    console.log("Seeding permissions catalog...");
    for (const item of permissionsData) {
      for (const action of actions) {
        const code = `${item.moduleCode}_${action}`;
        const name = `${action.charAt(0) + action.slice(1).toLowerCase()} ${item.name}`;

        await Permission.findOrCreate({
          where: { permissionCode: code },
          defaults: {
            moduleName: item.moduleName,
            moduleCode: item.moduleCode,
            permissionName: name,
            permissionCode: code,
            action,
          },
        });
      }
    }

    // Also add explicit USERS and ROLES permissions
    const extra = [
      { moduleName: "Control", moduleCode: "USERS", name: "Users" },
      { moduleName: "Control", moduleCode: "ROLES", name: "Roles" },
    ];
    for (const item of extra) {
      for (const action of actions) {
        const code = `${item.moduleCode}_${action}`;
        const name = `${action.charAt(0) + action.slice(1).toLowerCase()} ${item.name}`;

        await Permission.findOrCreate({
          where: { permissionCode: code },
          defaults: {
            moduleName: item.moduleName,
            moduleCode: item.moduleCode,
            permissionName: name,
            permissionCode: code,
            action,
          },
        });
      }
    }

    // 2. Seed SuperAdmin Role
    console.log("Seeding Super Admin role...");
    const [superAdminRole] = await Role.findOrCreate({
      where: { roleCode: "SUPER_ADMIN" },
      defaults: {
        roleName: "Super Admin",
        roleCode: "SUPER_ADMIN",
        description: "Full global access across all hubs and regions",
        isSystemRole: true,
        status: "ACTIVE",
      },
    });

    // 3. Seed Hub Admin Role
    console.log("Seeding Hub Admin role...");
    const [hubAdminRole] = await Role.findOrCreate({
      where: { roleCode: "HUB_ADMIN" },
      defaults: {
        roleName: "Hub Admin",
        roleCode: "HUB_ADMIN",
        description: "Admin access scoped to assigned hub",
        isSystemRole: false,
        status: "ACTIVE",
      },
    });

    // Assign all permissions to Hub Admin as an initial template
    const allPermissions = await Permission.findAll();
    for (const p of allPermissions) {
      await RolePermission.findOrCreate({
        where: { roleId: hubAdminRole.roleId, permissionId: p.permissionId },
        defaults: {
          roleId: hubAdminRole.roleId,
          permissionId: p.permissionId,
        },
      });
    }

    // 4. Seed Default SuperAdmin User if not exists
    console.log("Seeding default SuperAdmin user...");
    const superAdminEmail = "superadmin@warehouse.com";
    const existingUser = await User.findOne({ where: { email: superAdminEmail } });

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash("Admin@12345", 10);
      await User.create({
        firstName: "Super",
        lastName: "Admin",
        email: superAdminEmail,
        password: hashedPassword,
        phone: "+1234567890",
        roleId: superAdminRole.roleId,
        hubId: null,      // null = All hubs
        regionId: null,   // null = All regions
        status: "ACTIVE",
      });
      console.log("SuperAdmin user created: superadmin@warehouse.com / Admin@12345");
    }

    console.log("Seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();
