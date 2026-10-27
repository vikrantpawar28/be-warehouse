const { Op } = require("sequelize");
const sequelize = require("../../config/dbConnection");
const multer = require("multer");
const xlsx = require("xlsx");

const PurchaseOrder = require("./purchaseOrderModel");
const PurchaseOrderItem = require("./purchaseOrderItemModel");
const Vendor = require("../vendor/vendorModel");
const Hub = require("../hub/hubModel");
const Region = require("../region/regionModel");

const VALID_STATUSES = [
  "ISSUED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CLOSED",
  "CANCELLED",
];

const validateDestination = (body) => {
  const { targetDestinationType, hubId, regionId } = body;

  if (
    targetDestinationType === "HUB" &&
    (hubId == null || regionId != null)
  ) {
    return "Select a hub only for HUB destination.";
  }

  if (
    targetDestinationType === "REGION" &&
    (regionId == null || hubId != null)
  ) {
    return "Select a region only for REGION destination.";
  }

  if (!["HUB", "REGION"].includes(targetDestinationType)) {
    return "targetDestinationType must be HUB or REGION.";
  }

  return null;
};

// Create PO with line items
exports.createPurchaseOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const body = req.body;
    const destinationError = validateDestination(body);

    if (destinationError) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: destinationError,
      });
    }

    if (
      !body.erpPONumber ||
      !body.vendorId ||
      !body.poDate ||
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message:
          "erpPONumber, vendorId, poDate and at least one item are required.",
      });
    }

    const vendor = await Vendor.findByPk(body.vendorId, {
      transaction,
    });

    if (!vendor || !vendor.isActive) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Vendor does not exist or is inactive.",
      });
    }

    if (body.targetDestinationType === "HUB") {
      const hub = await Hub.findByPk(body.hubId, { transaction });

      if (!hub) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Hub not found.",
        });
      }
    } else {
      const region = await Region.findByPk(body.regionId, {
        transaction,
      });

      if (!region) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Region not found.",
        });
      }
    }

    const itemRows = body.items.map((item) => {
      const quantity = Number(item.orderedQuantity);
      const price = Number(item.unitPrice);

      if (
        !item.erpItemCode ||
        !item.itemDescription ||
        !item.uom ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(price) ||
        price < 0
      ) {
        throw new Error(
          "Every item requires a code, description, UOM, positive quantity and non-negative unit price."
        );
      }

      return {
        ...item,
        orderedQuantity: quantity,
        receivedQuantity: 0,
        unitPrice: price,
        lineTotal: (quantity * price).toFixed(2),
      };
    });

    const totalAmount = itemRows.reduce(
      (sum, item) => sum + Number(item.lineTotal),
      0
    );

    const po = await PurchaseOrder.create(
      {
        erpPONumber: body.erpPONumber,
        vendorId: body.vendorId,
        poDate: body.poDate,
        targetDestinationType: body.targetDestinationType,
        hubId: body.targetDestinationType === "HUB" ? body.hubId : null,
        regionId: body.targetDestinationType === "REGION" ? body.regionId : null,
        targetDestinationName: body.targetDestinationName,
        expectedDeliveryDate: body.expectedDeliveryDate,
        remarks: body.remarks,
        status: "ISSUED",
        totalAmount: totalAmount.toFixed(2),
        createdBy: req.user?.userId || null,
        updatedBy: req.user?.userId || null,
      },
      { transaction }
    );

    await PurchaseOrderItem.bulkCreate(
      itemRows.map((item) => ({
        ...item,
        purchaseOrderId: po.purchaseOrderId,
      })),
      { transaction, validate: true }
    );

    await transaction.commit();

    const result = await PurchaseOrder.findByPk(po.purchaseOrderId, {
      include: [
        { model: Vendor, as: "vendor" },
        { model: PurchaseOrderItem, as: "items" },
        { model: Hub, as: "hub" },
        { model: Region, as: "region" },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Purchase order created successfully.",
      data: result,
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();

    console.error("Create PO Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create purchase order.",
    });
  }
};

// List POs: search, filters, pagination and sorting
exports.getAllPurchaseOrders = async (req, res) => {
  try {
    const {
      search = "",
      status,
      vendorId,
      hubId,
      regionId,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.body;

    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    const allowedSort = [
      "purchaseOrderId",
      "erpPONumber",
      "poDate",
      "expectedDeliveryDate",
      "status",
      "totalAmount",
      "createdAt",
    ];

    const where = {};

    if (search.trim()) {
      where[Op.or] = [
        { erpPONumber: { [Op.iLike]: `%${search.trim()}%` } },
      ];
    }

    if (status) where.status = status;
    if (vendorId) where.vendorId = vendorId;
    if (hubId) where.hubId = hubId;
    if (regionId) where.regionId = regionId;

    if (fromDate || toDate) {
      where.poDate = {};
      if (fromDate) where.poDate[Op.gte] = fromDate;
      if (toDate) where.poDate[Op.lte] = toDate;
    }

    const { count, rows } = await PurchaseOrder.findAndCountAll({
      where,
      include: [
        {
          model: Vendor,
          as: "vendor",
          attributes: ["vendorId", "vendorCode", "vendorName"],
        },
        { model: Hub, as: "hub" },
        { model: Region, as: "region" },
        { model: PurchaseOrderItem, as: "items" },
      ],
      distinct: true,
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      order: [
        [
          allowedSort.includes(sortBy) ? sortBy : "createdAt",
          String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC",
        ],
      ],
    });

    const totalPages = Math.ceil(count / pageSize);

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        totalRecords: count,
        currentPage,
        limit: pageSize,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
    });
  } catch (error) {
    console.error("List PO Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch purchase orders.",
    });
  }
};

// Get PO details and its lines
exports.getPurchaseOrderById = async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id, {
      include: [
        { model: Vendor, as: "vendor" },
        { model: Hub, as: "hub" },
        { model: Region, as: "region" },
        { model: PurchaseOrderItem, as: "items" },
      ],
    });

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: po,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch purchase order.",
    });
  }
};

// Update PO metadata. Do not edit lines after receipts or closure.
exports.updatePurchaseOrder = async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id);

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found.",
      });
    }

    if (["CLOSED", "CANCELLED", "RECEIVED"].includes(po.status)) {
      return res.status(409).json({
        success: false,
        message: "This purchase order cannot be edited.",
      });
    }

    const allowed = [
      "poDate",
      "expectedDeliveryDate",
      "remarks",
      "targetDestinationName",
    ];

    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    updates.updatedBy = req.user?.userId || null;

    await po.update(updates);

    return res.status(200).json({
      success: true,
      message: "Purchase order updated successfully.",
      data: po,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update purchase order.",
    });
  }
};


// Dashboard counts
exports.getPurchaseOrderDashboard = async (req, res) => {
  try {
    const [total, issued, partial, received, cancelled, closed] = await Promise.all([
      PurchaseOrder.count(),
      PurchaseOrder.count({ where: { status: "ISSUED" } }),
      PurchaseOrder.count({ where: { status: "PARTIALLY_RECEIVED" } }),
      PurchaseOrder.count({ where: { status: "RECEIVED" } }),
      PurchaseOrder.count({ where: { status: "CANCELLED" } }),
      PurchaseOrder.count({ where: { status: "CLOSED" } }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalPurchaseOrders: total,
        issued,
        partiallyReceived: partial,
        received,
        cancelled,
        closed,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load PO dashboard.",
    });
  }
};

// Multer upload configuration for .xlsx, .xls, .csv
exports.upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(xlsx|xls|csv)$/i.test(file.originalname);
    if (!allowed) {
      return cb(new Error("Upload an XLSX, XLS or CSV file."));
    }
    cb(null, true);
  },
}).single("file");

/**
 * Normalizes header string for case-insensitive column matching
 */
const normalizeHeader = (str) =>
  String(str || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * Validates date string in YYYY-MM-DD format
 */
const isValidDateString = (val) => {
  if (!val) return false;
  if (val instanceof Date) return !isNaN(val.getTime());
  const str = String(val).trim();
  const match = str.match(/^(\d{4})[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])$/);
  if (!match) return false;
  const d = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
  return !isNaN(d.getTime());
};

const formatDateOnly = (val) => {
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val || "").trim().slice(0, 10);
};

/**
 * Helper to process and stage parsed spreadsheet rows
 */
const stageParsedRows = async (rows, req, res, destinationType, hubId, regionId) => {
  try {
    if (!Array.isArray(rows) || rows.length < 2) {
      return res.status(400).json({
        success: false,
        message: "The spreadsheet has no data rows.",
      });
    }

    const headerRow = rows[0] || [];
    const headerMap = {};
    headerRow.forEach((col, idx) => {
      headerMap[normalizeHeader(col)] = idx;
    });

    const getCol = (row, candidates) => {
      for (const c of candidates) {
        const idx = headerMap[normalizeHeader(c)];
        if (idx !== undefined && row[idx] !== undefined) {
          return row[idx];
        }
      }
      return undefined;
    };

    // Pre-load all vendors for vendorCode lookup
    const allVendors = await Vendor.findAll({
      attributes: ["vendorId", "vendorCode", "vendorName", "isActive"],
    });
    const vendorMap = new Map();
    allVendors.forEach((v) => vendorMap.set(String(v.vendorCode).trim().toLowerCase(), v));

    const errors = [];
    const preview = [];
    const poGroupMap = new Map();

    const dataRows = rows.slice(1);

    for (let idx = 0; idx < dataRows.length; idx++) {
      const row = dataRows[idx];
      const rowNumber = idx + 2;

      // Skip completely empty rows
      if (row.every((cell) => cell === "" || cell == null)) {
        continue;
      }

      const erpPONumber = String(
        getCol(row, ["ERP_PO_Number", "ERP_PONumber", "erpponumber", "ponumber", "po_no"]) || ""
      ).trim();
      const poDateRaw = getCol(row, ["PODate", "PO_Date", "podate", "date"]);
      const vendorCode = String(
        getCol(row, ["VendorCode", "Vendor_Code", "vendorcode", "vendor"]) || ""
      ).trim();
      const targetDestinationHub = String(
        getCol(row, ["TargetDestinationHub", "DestinationHub", "targethub"]) || ""
      ).trim();
      const expectedDeliveryDateRaw = getCol(row, [
        "ExpectedDeliveryDate",
        "DeliveryDate",
        "expecteddeliverydate",
      ]);
      const remarks = String(getCol(row, ["Remarks", "remarks", "comment"]) || "").trim();
      const erpItemCode = String(
        getCol(row, ["ERP_ItemCode", "ItemCode", "erpitemcode", "sku"]) || ""
      ).trim();
      const itemDescription = String(
        getCol(row, ["ItemDescription", "Description", "itemdescription"]) || ""
      ).trim();
      const itemType = String(getCol(row, ["ItemType", "Type", "itemtype"]) || "Standard").trim();
      const orderedQuantityRaw = getCol(row, ["OrderedQuantity", "Quantity", "orderedquantity", "qty"]);
      const uom = String(getCol(row, ["UOM", "uom", "unit"]) || "").trim();
      const unitPriceRaw = getCol(row, ["UnitPrice", "Price", "unitprice", "rate"]);

      const rowErrors = [];

      // 1. ERP_PO_Number validation
      if (!erpPONumber) {
        rowErrors.push({
          row: rowNumber,
          erpPONumber: "N/A",
          field: "ERP_PO_Number",
          message: "ERP_PO_Number is required.",
        });
      }

      // 2. PODate validation
      if (!poDateRaw || !isValidDateString(poDateRaw)) {
        rowErrors.push({
          row: rowNumber,
          erpPONumber,
          field: "PODate",
          message: `"${poDateRaw}" is not a valid date. Use a valid date in YYYY-MM-DD format.`,
        });
      }

      // 3. VendorCode validation
      let matchedVendor = null;
      if (!vendorCode) {
        rowErrors.push({
          row: rowNumber,
          erpPONumber,
          field: "VendorCode",
          message: "VendorCode is required.",
        });
      } else {
        matchedVendor = vendorMap.get(vendorCode.toLowerCase());
        if (!matchedVendor) {
          rowErrors.push({
            row: rowNumber,
            erpPONumber,
            field: "VendorCode",
            message: `Vendor with code '${vendorCode}' not found.`,
          });
        }
      }

      // 4. ExpectedDeliveryDate validation (optional, but must be valid if given)
      if (expectedDeliveryDateRaw && !isValidDateString(expectedDeliveryDateRaw)) {
        rowErrors.push({
          row: rowNumber,
          erpPONumber,
          field: "ExpectedDeliveryDate",
          message: `"${expectedDeliveryDateRaw}" is not a valid date. Use a valid date in YYYY-MM-DD format.`,
        });
      }

      // 5. ERP_ItemCode validation
      if (!erpItemCode) {
        rowErrors.push({
          row: rowNumber,
          erpPONumber,
          field: "ERP_ItemCode",
          message: "ERP_ItemCode is required.",
        });
      }

      // 6. ItemDescription validation
      if (!itemDescription) {
        rowErrors.push({
          row: rowNumber,
          erpPONumber,
          field: "ItemDescription",
          message: "ItemDescription is required.",
        });
      }

      // 7. OrderedQuantity validation
      const quantity = Number(orderedQuantityRaw);
      if (isNaN(quantity) || quantity <= 0) {
        rowErrors.push({
          row: rowNumber,
          erpPONumber,
          field: "OrderedQuantity",
          message: `Value is ${orderedQuantityRaw === undefined ? "empty" : orderedQuantityRaw}. Enter a quantity greater than 0.`,
        });
      }

      // 8. UOM validation
      if (!uom) {
        rowErrors.push({
          row: rowNumber,
          erpPONumber,
          field: "UOM",
          message: "UOM is required.",
        });
      }

      // 9. UnitPrice validation
      const price = Number(unitPriceRaw);
      if (isNaN(price) || price < 0) {
        rowErrors.push({
          row: rowNumber,
          erpPONumber,
          field: "UnitPrice",
          message: "UnitPrice must be a valid non-negative number.",
        });
      }

      const isValid = rowErrors.length === 0;
      if (!isValid) {
        errors.push(...rowErrors);
      }

      const lineTotal = !isNaN(quantity) && !isNaN(price) && quantity > 0 && price >= 0
        ? Number((quantity * price).toFixed(2))
        : 0;

      const formattedPoDate = isValidDateString(poDateRaw) ? formatDateOnly(poDateRaw) : String(poDateRaw || "");
      const formattedExpDate = isValidDateString(expectedDeliveryDateRaw)
        ? formatDateOnly(expectedDeliveryDateRaw)
        : String(expectedDeliveryDateRaw || "");

      const previewRow = {
        row: rowNumber,
        status: isValid ? "Valid" : "Error",
        erpPONumber,
        erpItemCode,
        itemDescription,
        itemType,
        orderedQuantity: isNaN(quantity) ? 0 : quantity,
        uom: uom || "EA",
        unitPrice: isNaN(price) ? 0 : price,
        lineTotal,
        poDate: formattedPoDate,
        vendorCode,
        expectedDeliveryDate: formattedExpDate,
        targetDestinationName: targetDestinationHub,
        remarks,
        errors: rowErrors.map((e) => e.message),
      };

      preview.push(previewRow);

      // Group rows by ERP_PO_Number
      const poKey = erpPONumber || `ROW_${rowNumber}`;
      if (!poGroupMap.has(poKey)) {
        poGroupMap.set(poKey, {
          erpPONumber,
          vendorId: matchedVendor?.vendorId || null,
          vendorCode,
          poDate: formattedPoDate,
          expectedDeliveryDate: formattedExpDate || null,
          targetDestinationName: targetDestinationHub || null,
          remarks: remarks || null,
          items: [],
          totalAmount: 0,
          isValid: true,
        });
      }

      const group = poGroupMap.get(poKey);
      group.items.push({
        erpItemCode,
        itemDescription,
        itemType,
        orderedQuantity: isNaN(quantity) ? 0 : quantity,
        receivedQuantity: 0,
        uom: uom || "EA",
        unitPrice: isNaN(price) ? 0 : price,
        lineTotal,
      });
      group.totalAmount = Number((group.totalAmount + lineTotal).toFixed(2));
      if (!isValid) group.isValid = false;
    }

    const groupedOrders = Array.from(poGroupMap.values());
    const validLines = preview.filter((r) => r.status === "Valid").length;
    const linesWithErrors = preview.filter((r) => r.status === "Error").length;
    const isConfirm = req.body.confirm === true || req.body.confirm === "true";

    const summary = {
      fileName: req.file.originalname,
      fileSize: `${Math.round(req.file.size / 1024)} KB`,
      poLinesProcessed: preview.length,
      purchaseOrdersFound: groupedOrders.length,
      validLines,
      linesWithErrors,
    };

    // If confirm=true was requested but errors exist, reject import
    if (isConfirm && linesWithErrors > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot import PO file: resolve ${linesWithErrors} error(s) before importing.`,
        summary,
        errors,
        preview,
      });
    }

    // If confirm=true and no errors, commit to database in a transaction
    if (isConfirm && linesWithErrors === 0) {
      const transaction = await sequelize.transaction();

      try {
        const createdPOs = [];

        for (const order of groupedOrders) {
          // Check if PO with this ERP number already exists
          let po = await PurchaseOrder.findOne({
            where: { erpPONumber: order.erpPONumber },
            transaction,
          });

          if (po) {
            await po.update(
              {
                vendorId: order.vendorId,
                poDate: order.poDate,
                targetDestinationType: destinationType,
                hubId: destinationType === "HUB" ? hubId : null,
                regionId: destinationType === "REGION" ? regionId : null,
                targetDestinationName: order.targetDestinationName,
                expectedDeliveryDate: order.expectedDeliveryDate,
                remarks: order.remarks,
                status: "ISSUED",
                totalAmount: order.totalAmount.toFixed(2),
                updatedBy: req.user?.userId || null,
              },
              { transaction }
            );

            // Re-populate items
            await PurchaseOrderItem.destroy({
              where: { purchaseOrderId: po.purchaseOrderId },
              transaction,
            });
          } else {
            po = await PurchaseOrder.create(
              {
                erpPONumber: order.erpPONumber,
                vendorId: order.vendorId,
                poDate: order.poDate,
                targetDestinationType: destinationType,
                hubId: destinationType === "HUB" ? hubId : null,
                regionId: destinationType === "REGION" ? regionId : null,
                targetDestinationName: order.targetDestinationName,
                expectedDeliveryDate: order.expectedDeliveryDate,
                remarks: order.remarks,
                status: "ISSUED",
                totalAmount: order.totalAmount.toFixed(2),
                createdBy: req.user?.userId || null,
                updatedBy: req.user?.userId || null,
              },
              { transaction }
            );
          }

          const itemRecords = order.items.map((item) => ({
            ...item,
            purchaseOrderId: po.purchaseOrderId,
          }));

          await PurchaseOrderItem.bulkCreate(itemRecords, {
            transaction,
            validate: true,
          });

          createdPOs.push(po);
        }

        await transaction.commit();

        return res.status(201).json({
          success: true,
          message: `Successfully imported ${createdPOs.length} purchase order(s).`,
          summary,
          data: createdPOs,
        });
      } catch (commitErr) {
        await transaction.rollback();
        throw commitErr;
      }
    }

    // Default: Return Validation & Review summary (Step 2 of modal)
    return res.status(200).json({
      success: true,
      message:
        linesWithErrors > 0
          ? `Validation completed with ${linesWithErrors} error(s). Review before importing.`
          : "File validated successfully. Ready for import.",
      summary,
      errors,
      preview,
    });
  } catch (err) {
    console.error("stageParsedRows error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to process spreadsheet rows.",
    });
  }
};

// Upload file and stage rows
exports.uploadAndStage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Upload a file using the file field.",
      });
    }

    const { destinationType, hubId, regionId } = req.body;

    if (
      destinationType === "HUB"
        ? !hubId || regionId
        : destinationType === "REGION"
          ? !regionId || hubId
          : true
    ) {
      return res.status(400).json({
        success: false,
        message: "Select exactly one hub or region.",
      });
    }

    if (destinationType === "HUB") {
      if (!(await Hub.findByPk(hubId))) {
        return res.status(400).json({
          success: false,
          message: "Hub not found.",
        });
      }
    } else if (!(await Region.findByPk(regionId))) {
      return res.status(400).json({
        success: false,
        message: "Region not found.",
      });
    }

    // Parse spreadsheet from buffer using xlsx (handles .xlsx, .xls, .csv)
    let workbook;
    try {
      workbook = xlsx.read(req.file.buffer, {
        type: "buffer",
        cellDates: true,
      });
    } catch (readErr) {
      return res.status(400).json({
        success: false,
        message: `Failed to read spreadsheet file: ${readErr.message}`,
      });
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({
        success: false,
        message: "The uploaded file contains no sheets.",
      });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    });

    if (!rows || rows.length < 2) {
      return res.status(400).json({
        success: false,
        message: "The spreadsheet has no data rows.",
      });
    }

    return await stageParsedRows(
      rows,
      req,
      res,
      destinationType,
      hubId,
      regionId
    );
  } catch (error) {
    console.error("PO upload error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to upload PO file.",
    });
  }
};

exports.downloadSampleTemplate = async (req, res) => {
  try {
    const sampleHeaders = [
      "ERP_PO_Number",
      "PODate",
      "VendorCode",
      "TargetDestinationHub",
      "ExpectedDeliveryDate",
      "Remarks",
      "ERP_ItemCode",
      "ItemDescription",
      "ItemType",
      "OrderedQuantity",
      "UOM",
      "UnitPrice",
    ];

    // Attempt to fetch an active vendor so the sample file has a valid vendor code
    let sampleVendorCode = "V-201";
    try {
      const activeVendor = await Vendor.findOne({
        where: { isActive: true },
        attributes: ["vendorCode"],
        order: [["vendorId", "ASC"]],
      });
      if (activeVendor && activeVendor.vendorCode) {
        sampleVendorCode = activeVendor.vendorCode;
      }
    } catch (_) {
      // fallback to V-201
    }

    // Attempt to fetch an active hub for TargetDestinationHub
    let sampleHubName = "West Hub (Bhiwandi)";
    try {
      const activeHub = await Hub.findOne({
        attributes: ["hubName"],
        order: [["hubId", "ASC"]],
      });
      if (activeHub && activeHub.hubName) {
        sampleHubName = activeHub.hubName;
      }
    } catch (_) {
      // fallback
    }

    const sampleRows = [
      {
        ERP_PO_Number: "PO-260041",
        PODate: "2026-10-13",
        VendorCode: sampleVendorCode,
        TargetDestinationHub: sampleHubName,
        ExpectedDeliveryDate: "2026-10-24",
        Remarks: "Deliver to receiving bay 1",
        ERP_ItemCode: "ITM-1001",
        ItemDescription: "Corrugated carton, large",
        ItemType: "Packing",
        OrderedQuantity: 500,
        UOM: "EA",
        UnitPrice: 1.8,
      }
    ];

    const worksheet = xlsx.utils.json_to_sheet(sampleRows, { header: sampleHeaders });

    // Set readable column widths
    worksheet["!cols"] = [
      { wch: 16 }, // ERP_PO_Number
      { wch: 12 }, // PODate
      { wch: 14 }, // VendorCode
      { wch: 24 }, // TargetDestinationHub
      { wch: 22 }, // ExpectedDeliveryDate
      { wch: 28 }, // Remarks
      { wch: 16 }, // ERP_ItemCode
      { wch: 30 }, // ItemDescription
      { wch: 14 }, // ItemType
      { wch: 16 }, // OrderedQuantity
      { wch: 8 },  // UOM
      { wch: 12 }, // UnitPrice
    ];

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "PO_Import_Template");

    const excelBuffer = xlsx.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="sample_po_export.xlsx"'
    );
    return res.status(200).send(excelBuffer);
  } catch (error) {
    console.error("downloadSampleTemplate error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate sample spreadsheet template.",
    });
  }
};

