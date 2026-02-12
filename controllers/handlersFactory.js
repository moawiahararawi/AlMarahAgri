const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const ApiFeatures = require("../utils/apiFeatures");

exports.deleteOne = (Model) =>
  asyncHandler(async (req, res, next) => {
    const document = await Model.findByIdAndDelete(req.params.id);

    if (!document) {
      return next(new ApiError("No document found", 404));
    }

    res.status(204).send();
  });

exports.updateOne = (Model) =>
  asyncHandler(async (req, res, next) => {
    const document = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!document) {
      return next(new ApiError("No document found", 404));
    }

    res.status(200).json({ data: document });
  });

exports.createOne = (Model) =>
  asyncHandler(async (req, res) => {
    const document = await Model.create(req.body);
    res.status(201).json({ data: document });
  });

exports.getOne = (Model, populateOpts) =>
  asyncHandler(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (populateOpts) query = query.populate(populateOpts);

    const document = await query;

    if (!document) {
      return next(new ApiError("No document found", 404));
    }

    res.status(200).json({ data: document });
  });

exports.getAll = (Model, modelName = "") =>
  asyncHandler(async (req, res) => {
    const apiFeatures = new ApiFeatures(Model.find(), req.query)
      .filter()
      .search(modelName)
      .sort()
      .limitFields();

    const count = await Model.countDocuments(apiFeatures.mongooseQuery);
    apiFeatures.paginate(count);

    const documents = await apiFeatures.mongooseQuery;

    res.status(200).json({
      results: documents.length,
      paginationResult: apiFeatures.paginationResult,
      data: documents,
    });
  });
