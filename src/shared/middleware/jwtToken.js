const { verifyAccessToken } = require("../utils/token");
const { isIpAllowed } = require("../utils/ipAllowlist");
const { runWithUser } = require("../utils/requestContext");

async function verifyToken(req, res, next) {
  let token;
  let authHeader = req.headers.authorization;

  if (!authHeader) {
    res
      .status(401)
      .json({ status: 401, error: 401, message: "Bearer token is required" });
    return;
  }

  if (authHeader && authHeader.startsWith("Bearer")) {
    token = authHeader.split(" ")[1];

    try {
      const decoded = verifyAccessToken(token);

      // Company-level IP restriction, embedded in the token at login/refresh so this
      // check never needs an extra DB round-trip on every request.
      if (decoded.ipWhitelistEnabled && !isIpAllowed(req.ip, decoded.ipWhitelist)) {
        return res.status(403).json({
          status: 403,
          error: 403,
          message: "Access denied from this network. Contact your administrator if this is unexpected.",
        });
      }

      req.user = decoded;

      // §30 — SuperAdmin's "acting on Company X" context, read from a per-request header so
      // switching companies in the UI never needs a re-login/token refresh. Only ever honored
      // when the JWT's OWN verified role is SuperAdmin — a non-SuperAdmin sending this header
      // is simply ignored, never trusted to narrow/widen their own access.
      if (decoded.role === "SuperAdmin") {
        const actingCompanyId = parseInt(req.headers["x-acting-company-id"], 10);
        if (Number.isInteger(actingCompanyId)) {
          req.user.actingCompanyId = actingCompanyId;
        }
      }

      runWithUser(decoded, next);
    } catch (err) {
      res
        .status(401)
        .json({ status: 401, error: 401, message: "User is not authorized" });
    }
  }
}

module.exports = verifyToken;
