export const eq = (a: any, b: any) => {
    return a === b;
};

export const neq = (a: any, b: any) => {
    return a !== b;
};

export const or = (...args: any[]) => {
    return args.slice(0, -1).some(Boolean);
};

export const and = (...args: any[]) => {
    return args.slice(0, -1).every(Boolean);
};

export const isStaff = (role: any) => {
    return role === 'admin' || role === 'moderator';
};