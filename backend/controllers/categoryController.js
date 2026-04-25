const asyncHandler = require('express-async-handler');
const Category = require('../models/Category');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
    const categories = await Category.find({});
    res.json({
        status: 'success',
        message: 'Categories fetched successfully',
        data: categories,
    });
});

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = asyncHandler(async (req, res) => {
    const { name, description, image } = req.body;

    const categoryExists = await Category.findOne({ name });
    if (categoryExists) {
        res.status(400);
        throw new Error('Category already exists');
    }

    const category = new Category({
        name,
        description,
        image: image || '/images/default-category.png',
    });

    const createdCategory = await category.save();

    res.status(201).json({
        status: 'success',
        message: 'Category created successfully',
        data: createdCategory,
    });
});

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);

    if (category) {
        await Category.deleteOne({ _id: category._id });
        res.json({
            status: 'success',
            message: 'Category removed successfully',
            data: null,
        });
    } else {
        res.status(404);
        throw new Error('Category not found');
    }
});

module.exports = {
    getCategories,
    createCategory,
    deleteCategory,
};
