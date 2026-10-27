const AuditLog = require("../../app/hrms/auditLog/auditLogModel");
const { getRegisteredModel } = require("../utils/auditModelRegistry");

const REDACTED_FIELDS = new Set([
  "password", "newPassword", "oldPassword", "mfaSecret", "resetPasswordToken", "passwordHistory",
  "passwordResetOtp", "otp",
  "panOrNationalTaxId", "bankAccountNumber", "bankIfscOrRoutingCode", "uanOrSocialSecurityNo",
  "annualCTC", "currentCTC", "revisedCTC", "amount", "amountRequested", "amountClaimed",
  "monthlyEmi", "outstandingBalance", "grossEarnings", "statutoryDeductions",
  "otherDeductions", "tds", "netPay", "earningsBreakup", "deductionsBreakup",
  "pfEmployeeContribution", "pfEmployerContribution", "esiEmployeeContribution",
  "esiEmployerContribution", "professionalTax", "lwfEmployeeContribution",
  "lwfEmployerContribution", "reimbursementsPayable", "loanEmiDeduction", "adhocAdjustment",
  "arrearAmount", "pfOnArrear", "tdsOnArrear", "netArrear", "manualTDSOverride",
  "declaredAmount", "approvedAmount", "grossSalaryPaid", "totalTaxDeducted",
  "exemptionsClaimed", "totalDisbursementAmount", "totalEmployerContribution",
  "totalEmployeeContribution", "templateSnapshot", "dataSnapshot", "proofDocumentUrl", "billUrl",
]);

const sanitize = (value, key) => {
  if (REDACTED_FIELDS.has(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item) => sanitize(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, sanitize(childValue, childKey)]));
  }
  return value;
};

const toPlain = (instance) => {
  if (!instance) return null;
  const plain = instance.toJSON ? instance.toJSON() : instance;
  const cleaned = {};
  for (const [key, value] of Object.entries(plain)) {
    cleaned[key] = sanitize(value, key);
  }
  return cleaned;
};

const diffRecords = (before, after) => {
  if (!before && !after) return undefined;
  const changes = {};
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  for (const key of keys) {
    if (key === "createdAt" || key === "updatedAt") continue;
    const b = before ? before[key] : undefined;
    const a = after ? after[key] : undefined;
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      changes[key] = { before: b ?? null, after: a ?? null };
    }
  }
  return Object.keys(changes).length ? changes : undefined;
};

const auditLogger = async (req, res, next) => {
  try {
    const method = req.method;
    const originalSend = res.send;

    // No /api prefix here — routes mount directly at root (e.g. /employees/updateEmployee/5),
    // so the entity is the FIRST segment and the record id (if any) is the LAST segment.
    const segments = req.originalUrl.split("?")[0].split("/").filter(Boolean);
    const entityName = segments[0] || "unknown";
    const lastSegment = segments[segments.length - 1];
    const recordId = /^\d+$/.test(lastSegment) ? Number(lastSegment) : null;

    const registered =
      ["PUT", "PATCH", "DELETE"].includes(method) && recordId ? getRegisteredModel(entityName) : null;

    const beforeRecord = registered
      ? await registered.model.findByPk(recordId).catch(() => null)
      : null;

    res.send = function (data) {
      // Only log mutations (POST, PUT, PATCH, DELETE)
      if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        // Sanitize payload (remove passwords/sensitive info)
        const payload = sanitize(req.body || {});

        // We don't block the response. Just fire and forget.
        const writeLog = async () => {
          let changes;
          if (registered) {
            const afterRecord =
              method === "DELETE" ? null : await registered.model.findByPk(recordId).catch(() => null);
            changes = diffRecords(toPlain(beforeRecord), toPlain(afterRecord));
          }

          await AuditLog.create({
            userId: req.user?.userId || null,
            userEmail: req.user?.email || null,
            action: method,
            endpoint: req.originalUrl,
            entityName,
            payload,
            changes: changes || null,
            ipAddress: req.ip || req.connection.remoteAddress,
          });
        };

        writeLog().catch((err) => console.error("Failed to write audit log:", err));
      }

      // Call the original send
      originalSend.call(this, data);
    };

    next();
  } catch (err) {
    console.error("Audit logger error:", err);
    next();
  }
};

module.exports = auditLogger;
