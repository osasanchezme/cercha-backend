const {
    Matrix,
    inverse,
  } = require('ml-matrix');

/**
 * Processes all the raw input data
 * @param {{"dimensions":{"a":Number, "b":Number, "c":Number, "d":Number, "h":Number}, "loads": {"p1":Number, "p2": Number, "p3": Number}, "properties": {"area":Number, "elasticity":Number}}} model 
 * @returns 
 */
const processInput = (model) => {
    const dofs = {
        "1": {'u': 7,'v': 8},
        "2": {'u': 5,'v': 6},
        "3": {'u': 9,'v': 10},
        "4": {'u': 1,'v': 2},
        "5": {'u': 3,'v': 4},
    };
    const nodes = {
        '1': {
            'x': 0,
            'y': 0
        },
        '2': {
            'x': model.dimensions.a,
            'y': 0
        },
        '3': {
            'x': model.dimensions.a + model.dimensions.b,
            'y': 0
        },
        '4': {
            'x': model.dimensions.c,
            'y': model.dimensions.h
        },
        '5': {
            'x': model.dimensions.a + model.dimensions.b - model.dimensions.d,
            'y': model.dimensions.h
        },
    };
    const elements = {
        '1': {
            'start_node': 1,
            'end_node': 4,
            'L': 0,
            'cos': 0,
            'sin': 0,
            'A': model.properties.area,
            'E': model.properties.elasticity
        },
        '2': {
            'start_node': 1,
            'end_node': 2,
            'L': 0,
            'cos': 0,
            'sin': 0,
            'A': model.properties.area,
            'E': model.properties.elasticity
        },
        '3': {
            'start_node': 4,
            'end_node': 2,
            'L': 0,
            'cos': 0,
            'sin': 0,
            'A': model.properties.area,
            'E': model.properties.elasticity
        },
        '4': {
            'start_node': 4,
            'end_node': 5,
            'L': 0,
            'cos': 0,
            'sin': 0,
            'A': model.properties.area,
            'E': model.properties.elasticity
        },
        '5': {
            'start_node': 2,
            'end_node': 5,
            'L': 0,
            'cos': 0,
            'sin': 0,
            'A': model.properties.area,
            'E': model.properties.elasticity
        },
        '6': {
            'start_node': 5,
            'end_node': 3,
            'L': 0,
            'cos': 0,
            'sin': 0,
            'A': model.properties.area,
            'E': model.properties.elasticity
        },
        '7': {
            'start_node': 2,
            'end_node': 3,
            'L': 0,
            'cos': 0,
            'sin': 0,
            'A': model.properties.area,
            'E': model.properties.elasticity
        },
    };

    // Find length, sin and cos
    Object.keys(elements).forEach((key) => {
        const start_node = nodes[elements[key].start_node];
        const end_node = nodes[elements[key].end_node];
        const length = Math.sqrt((start_node.x - end_node.x)**2 + (start_node.y - end_node.y)**2);
        const cos = (start_node.x - end_node.x ) / length;
        const sin = (start_node.y - end_node.y ) / length;
        elements[key].L = length;
        elements[key].cos = cos;
        elements[key].sin = sin;
    });

    // Put external forces vector together
    const ext_forces =  new Matrix([[
        model.loads.p2,
        -model.loads.p1,
        0,
        -model.loads.p3,
        0,
        0
    ]]);

    return {elements, ext_forces, dofs}
};

const getStiffnessMatrices = (elements) => {
    let local_matrices = {};
    Object.keys(elements).forEach((key) => {
        const {A, E, L} = elements[key];
        local_matrices[key] = new Matrix([
            [1, 0, -1, 0],
            [0, 0, 0, 0],
            [-1, 0, 1, 0],
            [0, 0, 0, 0]
        ]).mul(A*E/L);
    });

    let t_matrices = {};
    Object.keys(elements).forEach((key) => {
        const {sin, cos} = elements[key];
        t_matrices[key] = new Matrix([
            [cos, -sin, 0, 0],
            [sin, cos, 0, 0],
            [0, 0, cos, -sin],
            [0, 0, sin, cos],
        ]);
    });

    let global_matrices = {};
    Object.keys(elements).forEach((key) => {
        global_matrices[key] = t_matrices[key].mmul(local_matrices[key].mmul(t_matrices[key].transpose()))
    });

    return {t_matrices, global_matrices};
};

const assembleMatrix = (elements, global_matrices, dofs) => {
    let matrix_total = new Matrix(Object.entries(dofs).length * 2, Object.entries(dofs).length * 2);
    Object.keys(elements).forEach((key) => {
        const dof_elem = [
            dofs[elements[key].start_node].u,
            dofs[elements[key].start_node].v,
            dofs[elements[key].end_node].u,
            dofs[elements[key].end_node].v,
        ];

        for (let i = 0; i < dof_elem.length; i++){
            for (let j = 0; j < dof_elem.length; j++){
                matrix_total.set(
                    dof_elem[i]-1, dof_elem[j]-1,
                    matrix_total.get(dof_elem[i]-1, dof_elem[j]-1) + global_matrices[key].get(i, j)
                    );
            }
        }
    });
    return matrix_total;
};

const solve_system = (matrix_total, ext_forces, dofs, elements, t_matrices, global_matrices) => {
    ext_forces = ext_forces.transpose();
    let knn = new Matrix(ext_forces.rows, ext_forces.rows);
    for (let i = 0; i < ext_forces.rows; i ++){
        for (let j = 0; j < ext_forces.rows; j ++){
            knn.set(i, j, matrix_total.get(i, j));
        }
    }
    let kan = new Matrix(matrix_total.rows - ext_forces.rows, ext_forces.rows);
    for (let i = 0; i < matrix_total.rows - ext_forces.rows; i ++){
        for (let j = 0; j < ext_forces.rows; j ++){
            kan.set(i, j, matrix_total.get(ext_forces.rows + i, j));
        }
    }
    const un = inverse(knn).mmul(ext_forces);
    const fa = kan.mmul(un);

    const reactions = {
        '1': {
            'x': Number(fa.get(0,0)).toFixed(3),
            'y': Number(fa.get(1,0)).toFixed(3),
        },
        '2': {
            'x': Number(fa.get(2,0)).toFixed(3),
            'y': Number(fa.get(3,0)).toFixed(3),
        },
    }

    const ut = Matrix.columnVector([un.get(0,0), un.get(1,0), un.get(2,0), un.get(3,0), un.get(4,0), un.get(5,0), 0, 0, 0, 0]);
    const forces = {}
    // Find internal force for each element
    Object.keys(elements).forEach((key) => {
        const u_eg = Matrix.columnVector(
            [
                ut.get(dofs[elements[key].start_node].u-1, 0),
                ut.get(dofs[elements[key].start_node].v-1, 0),
                ut.get(dofs[elements[key].end_node].u-1, 0),
                ut.get(dofs[elements[key].end_node].v-1, 0)
            ]
        );
        
        const global_force = global_matrices[key].mmul(u_eg);
        const local_force = t_matrices[key].transpose().mmul(global_force);
        const value = Number(local_force.get(0,0)).toFixed(3); 
        const condition = (value > 0) ? 'C' : 'T';

        forces[key] = {
            'value': Math.abs(value),
            'condition': condition
        }
    });

    return {reactions, forces};
};

module.exports = {processInput, getStiffnessMatrices, assembleMatrix, solve_system}