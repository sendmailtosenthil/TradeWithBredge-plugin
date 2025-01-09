export function capitalizeFirstLetter(val) {
    return String(val).toLowerCase().charAt(0).toUpperCase() + String(val).slice(1);
}