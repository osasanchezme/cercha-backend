const utils = require('./utils')

/**
 * Solves the truss problem
 * @param {Object} model Object containing all the info of the truss
 */
const solve = (model) => {
    // Extract all the info from the user input
    let {elements, ext_forces, dofs} = utils.processInput(model);
    // Create transformation and stiffness matrices
    let {t_matrices, global_matrices} = utils.getStiffnessMatrices(elements);
    // Assemble the total stiffness matrix
    let matrix_total = utils.assembleMatrix(elements, global_matrices, dofs);
    // Solve the system
    let {reactions, forces} = utils.solve_system(matrix_total, ext_forces, dofs, elements, t_matrices, global_matrices);
    return {
        reactions,
        forces
    }
};

module.exports = solve;