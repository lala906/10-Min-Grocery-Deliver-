import React from 'react';
import { Link } from 'react-router-dom';

const CategoryCard = ({ category }) => {
    return (
        <Link to={`/category/${category._id}`} className="group flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
            <div className="w-20 h-20 mb-3 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center p-2 group-hover:bg-green-50 dark:group-hover:bg-green-900/40 transition-colors">
                <img
                    src={category.image || '/placeholder.png'}
                    alt={category.name}
                    className="w-full h-full object-contain mix-blend-multiply"
                />
            </div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 text-center tracking-tight transition-colors">{category.name}</h3>
        </Link>
    );
};

export default CategoryCard;
