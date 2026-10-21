
const warehouse = (app) => {
  app.use("/regions", require("../app/region/regionRoutes"));
  app.use("/hubs", require("../app/hub/hubRoutes"));
  app.use("/users", require("../app/user/userRoutes"));
  app.use("/roles", require("../app/role/roleRoutes"));
};


const routes = {
  warehouse,
};

module.exports = routes[process.env.PROJ_NAME];