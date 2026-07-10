// Periodic table data and lookup helpers.
// Extracted verbatim from the original AtomiumCanvas.jsx monolith — no logic changes.

export const ELEMENTS = [
  { z: 1, sym: "H", name: "Hydrogen", mass: 1.008, group: "nonmetal", color: 0x60a5fa, valence: 1, en: 2.2, shells: [1], row: 1, col: 1 },
  { z: 2, sym: "He", name: "Helium", mass: 4.003, group: "noble", color: 0xa78bfa, valence: 2, en: null, shells: [2], row: 1, col: 18 },
  { z: 3, sym: "Li", name: "Lithium", mass: 6.94, group: "alkali", color: 0xf97316, valence: 1, en: 0.98, shells: [2, 1], row: 2, col: 1 },
  { z: 4, sym: "Be", name: "Beryllium", mass: 9.012, group: "alkaline earth", color: 0xfacc15, valence: 2, en: 1.57, shells: [2, 2], row: 2, col: 2 },
  { z: 5, sym: "B", name: "Boron", mass: 10.81, group: "metalloid", color: 0x06b6d4, valence: 3, en: 2.04, shells: [2, 3], row: 2, col: 13 },
  { z: 6, sym: "C", name: "Carbon", mass: 12.011, group: "nonmetal", color: 0x9ca3af, valence: 4, en: 2.55, shells: [2, 4], row: 2, col: 14 },
  { z: 7, sym: "N", name: "Nitrogen", mass: 14.007, group: "nonmetal", color: 0x3b82f6, valence: 5, en: 3.04, shells: [2, 5], row: 2, col: 15 },
  { z: 8, sym: "O", name: "Oxygen", mass: 15.999, group: "nonmetal", color: 0xef4444, valence: 6, en: 3.44, shells: [2, 6], row: 2, col: 16 },
  { z: 9, sym: "F", name: "Fluorine", mass: 18.998, group: "nonmetal", color: 0x38bdf8, valence: 7, en: 3.98, shells: [2, 7], row: 2, col: 17 },
  { z: 10, sym: "Ne", name: "Neon", mass: 20.18, group: "noble", color: 0xc084fc, valence: 8, en: null, shells: [2, 8], row: 2, col: 18 },
  { z: 11, sym: "Na", name: "Sodium", mass: 22.99, group: "alkali", color: 0xf97316, valence: 1, en: 0.93, shells: [2, 8, 1], row: 3, col: 1 },
  { z: 12, sym: "Mg", name: "Magnesium", mass: 24.305, group: "alkaline earth", color: 0xfacc15, valence: 2, en: 1.31, shells: [2, 8, 2], row: 3, col: 2 },
  { z: 13, sym: "Al", name: "Aluminium", mass: 26.982, group: "transition metal", color: 0xf43f5e, valence: 3, en: 1.61, shells: [2, 8, 3], row: 3, col: 13 },
  { z: 14, sym: "Si", name: "Silicon", mass: 28.085, group: "metalloid", color: 0x06b6d4, valence: 4, en: 1.9, shells: [2, 8, 4], row: 3, col: 14 },
  { z: 15, sym: "P", name: "Phosphorus", mass: 30.974, group: "nonmetal", color: 0x38bdf8, valence: 5, en: 2.19, shells: [2, 8, 5], row: 3, col: 15 },
  { z: 16, sym: "S", name: "Sulfur", mass: 32.06, group: "nonmetal", color: 0x38bdf8, valence: 6, en: 2.58, shells: [2, 8, 6], row: 3, col: 16 },
  { z: 17, sym: "Cl", name: "Chlorine", mass: 35.45, group: "nonmetal", color: 0x38bdf8, valence: 7, en: 3.16, shells: [2, 8, 7], row: 3, col: 17 },
  { z: 18, sym: "Ar", name: "Argon", mass: 39.948, group: "noble", color: 0xc084fc, valence: 8, en: null, shells: [2, 8, 8], row: 3, col: 18 },
  { z: 19, sym: "K", name: "Potassium", mass: 39.098, group: "alkali", color: 0xf97316, valence: 1, en: 0.82, shells: [2, 8, 8, 1], row: 4, col: 1 },
  { z: 20, sym: "Ca", name: "Calcium", mass: 40.078, group: "alkaline earth", color: 0xfacc15, valence: 2, en: 1, shells: [2, 8, 8, 2], row: 4, col: 2 },
  { z: 21, sym: "Sc", name: "Scandium", mass: 44.956, group: "transition metal", color: 0xf43f5e, valence: 2, en: 1.36, shells: [2, 8, 9, 2], row: 4, col: 3 },
  { z: 22, sym: "Ti", name: "Titanium", mass: 47.867, group: "transition metal", color: 0xf43f5e, valence: 2, en: 1.54, shells: [2, 8, 10, 2], row: 4, col: 4 },
  { z: 23, sym: "V", name: "Vanadium", mass: 50.942, group: "transition metal", color: 0xf43f5e, valence: 2, en: 1.63, shells: [2, 8, 11, 2], row: 4, col: 5 },
  { z: 24, sym: "Cr", name: "Chromium", mass: 51.996, group: "transition metal", color: 0xf43f5e, valence: 1, en: 1.66, shells: [2, 8, 13, 1], row: 4, col: 6 },
  { z: 25, sym: "Mn", name: "Manganese", mass: 54.938, group: "transition metal", color: 0xf43f5e, valence: 2, en: 1.55, shells: [2, 8, 13, 2], row: 4, col: 7 },
  { z: 26, sym: "Fe", name: "Iron", mass: 55.845, group: "transition metal", color: 0xf43f5e, valence: 2, en: 1.83, shells: [2, 8, 14, 2], row: 4, col: 8 },
  { z: 27, sym: "Co", name: "Cobalt", mass: 58.933, group: "transition metal", color: 0xf43f5e, valence: 2, en: 1.88, shells: [2, 8, 15, 2], row: 4, col: 9 },
  { z: 28, sym: "Ni", name: "Nickel", mass: 58.693, group: "transition metal", color: 0xf43f5e, valence: 2, en: 1.91, shells: [2, 8, 16, 2], row: 4, col: 10 },
  { z: 29, sym: "Cu", name: "Copper", mass: 63.546, group: "transition metal", color: 0xf43f5e, valence: 1, en: 1.9, shells: [2, 8, 18, 1], row: 4, col: 11 },
  { z: 30, sym: "Zn", name: "Zinc", mass: 65.382, group: "transition metal", color: 0xf43f5e, valence: 2, en: 1.65, shells: [2, 8, 18, 2], row: 4, col: 12 },
  { z: 31, sym: "Ga", name: "Gallium", mass: 69.723, group: "transition metal", color: 0xf43f5e, valence: 3, en: 1.81, shells: [2, 8, 18, 3], row: 4, col: 13 },
  { z: 32, sym: "Ge", name: "Germanium", mass: 72.631, group: "metalloid", color: 0x06b6d4, valence: 4, en: 2.01, shells: [2, 8, 18, 4], row: 4, col: 14 },
  { z: 33, sym: "As", name: "Arsenic", mass: 74.922, group: "metalloid", color: 0x06b6d4, valence: 5, en: 2.18, shells: [2, 8, 18, 5], row: 4, col: 15 },
  { z: 34, sym: "Se", name: "Selenium", mass: 78.972, group: "nonmetal", color: 0x38bdf8, valence: 6, en: 2.55, shells: [2, 8, 18, 6], row: 4, col: 16 },
  { z: 35, sym: "Br", name: "Bromine", mass: 79.904, group: "nonmetal", color: 0x38bdf8, valence: 7, en: 2.96, shells: [2, 8, 18, 7], row: 4, col: 17 },
  { z: 36, sym: "Kr", name: "Krypton", mass: 83.798, group: "noble", color: 0xc084fc, valence: 8, en: 3, shells: [2, 8, 18, 8], row: 4, col: 18 },
  { z: 37, sym: "Rb", name: "Rubidium", mass: 85.468, group: "alkali", color: 0xf97316, valence: 1, en: 0.82, shells: [2, 8, 18, 8, 1], row: 5, col: 1 },
  { z: 38, sym: "Sr", name: "Strontium", mass: 87.621, group: "alkaline earth", color: 0xfacc15, valence: 2, en: 0.95, shells: [2, 8, 18, 8, 2], row: 5, col: 2 },
  { z: 39, sym: "Y", name: "Yttrium", mass: 88.906, group: "transition metal", color: 0xf43f5e, valence: 2, en: 1.22, shells: [2, 8, 18, 9, 2], row: 5, col: 3 },
  { z: 40, sym: "Zr", name: "Zirconium", mass: 91.224, group: "transition metal", color: 0xf43f5e, valence: 2, en: 1.33, shells: [2, 8, 18, 10, 2], row: 5, col: 4 },
  { z: 41, sym: "Nb", name: "Niobium", mass: 92.906, group: "transition metal", color: 0xf43f5e, valence: 1, en: 1.6, shells: [2, 8, 18, 12, 1], row: 5, col: 5 },
  { z: 42, sym: "Mo", name: "Molybdenum", mass: 95.951, group: "transition metal", color: 0xf43f5e, valence: 1, en: 2.16, shells: [2, 8, 18, 13, 1], row: 5, col: 6 },
  { z: 43, sym: "Tc", name: "Technetium", mass: 98, group: "transition metal", color: 0xf43f5e, valence: 2, en: 1.9, shells: [2, 8, 18, 13, 2], row: 5, col: 7 },
  { z: 44, sym: "Ru", name: "Ruthenium", mass: 101.072, group: "transition metal", color: 0xf43f5e, valence: 1, en: 2.2, shells: [2, 8, 18, 15, 1], row: 5, col: 8 },
  { z: 45, sym: "Rh", name: "Rhodium", mass: 102.906, group: "transition metal", color: 0xf43f5e, valence: 1, en: 2.28, shells: [2, 8, 18, 16, 1], row: 5, col: 9 },
  { z: 46, sym: "Pd", name: "Palladium", mass: 106.421, group: "transition metal", color: 0xf43f5e, valence: 18, en: 2.2, shells: [2, 8, 18, 18], row: 5, col: 10 },
  { z: 47, sym: "Ag", name: "Silver", mass: 107.868, group: "transition metal", color: 0xf43f5e, valence: 1, en: 1.93, shells: [2, 8, 18, 18, 1], row: 5, col: 11 },
  { z: 48, sym: "Cd", name: "Cadmium", mass: 112.414, group: "transition metal", color: 0xf43f5e, valence: 2, en: 1.69, shells: [2, 8, 18, 18, 2], row: 5, col: 12 },
  { z: 49, sym: "In", name: "Indium", mass: 114.818, group: "transition metal", color: 0xf43f5e, valence: 3, en: 1.78, shells: [2, 8, 18, 18, 3], row: 5, col: 13 },
  { z: 50, sym: "Sn", name: "Tin", mass: 118.711, group: "transition metal", color: 0xf43f5e, valence: 4, en: 1.96, shells: [2, 8, 18, 18, 4], row: 5, col: 14 },
  { z: 51, sym: "Sb", name: "Antimony", mass: 121.76, group: "metalloid", color: 0x06b6d4, valence: 5, en: 2.05, shells: [2, 8, 18, 18, 5], row: 5, col: 15 },
  { z: 52, sym: "Te", name: "Tellurium", mass: 127.603, group: "metalloid", color: 0x06b6d4, valence: 6, en: 2.1, shells: [2, 8, 18, 18, 6], row: 5, col: 16 },
  { z: 53, sym: "I", name: "Iodine", mass: 126.904, group: "nonmetal", color: 0x38bdf8, valence: 7, en: 2.66, shells: [2, 8, 18, 18, 7], row: 5, col: 17 },
  { z: 54, sym: "Xe", name: "Xenon", mass: 131.294, group: "noble", color: 0xc084fc, valence: 8, en: 2.6, shells: [2, 8, 18, 18, 8], row: 5, col: 18 },
  { z: 55, sym: "Cs", name: "Cesium", mass: 132.905, group: "alkali", color: 0xf97316, valence: 1, en: 0.79, shells: [2, 8, 18, 18, 8, 1], row: 6, col: 1 },
  { z: 56, sym: "Ba", name: "Barium", mass: 137.328, group: "alkaline earth", color: 0xfacc15, valence: 2, en: 0.89, shells: [2, 8, 18, 18, 8, 2], row: 6, col: 2 },
  { z: 57, sym: "La", name: "Lanthanum", mass: 138.905, group: "lanthanide", color: 0xf472b6, valence: 2, en: 1.1, shells: [2, 8, 18, 18, 9, 2], row: 9, col: 3 },
  { z: 58, sym: "Ce", name: "Cerium", mass: 140.116, group: "lanthanide", color: 0xf472b6, valence: 2, en: 1.12, shells: [2, 8, 18, 19, 9, 2], row: 9, col: 4 },
  { z: 59, sym: "Pr", name: "Praseodymium", mass: 140.908, group: "lanthanide", color: 0xf472b6, valence: 2, en: 1.13, shells: [2, 8, 18, 21, 8, 2], row: 9, col: 5 },
  { z: 60, sym: "Nd", name: "Neodymium", mass: 144.242, group: "lanthanide", color: 0xf472b6, valence: 2, en: 1.14, shells: [2, 8, 18, 22, 8, 2], row: 9, col: 6 },
  { z: 61, sym: "Pm", name: "Promethium", mass: 145, group: "lanthanide", color: 0xf472b6, valence: 2, en: 1.13, shells: [2, 8, 18, 23, 8, 2], row: 9, col: 7 },
  { z: 62, sym: "Sm", name: "Samarium", mass: 150.362, group: "lanthanide", color: 0xf472b6, valence: 2, en: 1.17, shells: [2, 8, 18, 24, 8, 2], row: 9, col: 8 },
  { z: 63, sym: "Eu", name: "Europium", mass: 151.964, group: "lanthanide", color: 0xf472b6, valence: 2, en: 1.2, shells: [2, 8, 18, 25, 8, 2], row: 9, col: 9 },
  { z: 64, sym: "Gd", name: "Gadolinium", mass: 157.253, group: "lanthanide", color: 0xf472b6, valence: 2, en: 1.2, shells: [2, 8, 18, 25, 9, 2], row: 9, col: 10 },
  { z: 65, sym: "Tb", name: "Terbium", mass: 158.925, group: "lanthanide", color: 0xf472b6, valence: 2, en: 1.1, shells: [2, 8, 18, 27, 8, 2], row: 9, col: 11 },
  { z: 66, sym: "Dy", name: "Dysprosium", mass: 162.5, group: "lanthanide", color: 0xf472b6, valence: 2, en: 1.22, shells: [2, 8, 18, 28, 8, 2], row: 9, col: 12 },
  { z: 67, sym: "Ho", name: "Holmium", mass: 164.93, group: "lanthanide", color: 0xf472b6, valence: 2, en: 1.23, shells: [2, 8, 18, 29, 8, 2], row: 9, col: 13 },
  { z: 68, sym: "Er", name: "Erbium", mass: 167.259, group: "lanthanide", color: 0xf472b6, valence: 2, en: 1.24, shells: [2, 8, 18, 30, 8, 2], row: 9, col: 14 },
  { z: 69, sym: "Tm", name: "Thulium", mass: 168.934, group: "lanthanide", color: 0xf472b6, valence: 2, en: 1.25, shells: [2, 8, 18, 31, 8, 2], row: 9, col: 15 },
  { z: 70, sym: "Yb", name: "Ytterbium", mass: 173.045, group: "lanthanide", color: 0xf472b6, valence: 2, en: 1.1, shells: [2, 8, 18, 32, 8, 2], row: 9, col: 16 },
  { z: 71, sym: "Lu", name: "Lutetium", mass: 174.967, group: "lanthanide", color: 0xf472b6, valence: 2, en: 1.27, shells: [2, 8, 18, 32, 9, 2], row: 9, col: 17 },
  { z: 72, sym: "Hf", name: "Hafnium", mass: 178.492, group: "transition metal", color: 0xf43f5e, valence: 2, en: 1.3, shells: [2, 8, 18, 32, 10, 2], row: 6, col: 4 },
  { z: 73, sym: "Ta", name: "Tantalum", mass: 180.948, group: "transition metal", color: 0xf43f5e, valence: 2, en: 1.5, shells: [2, 8, 18, 32, 11, 2], row: 6, col: 5 },
  { z: 74, sym: "W", name: "Tungsten", mass: 183.841, group: "transition metal", color: 0xf43f5e, valence: 2, en: 2.36, shells: [2, 8, 18, 32, 12, 2], row: 6, col: 6 },
  { z: 75, sym: "Re", name: "Rhenium", mass: 186.207, group: "transition metal", color: 0xf43f5e, valence: 2, en: 1.9, shells: [2, 8, 18, 32, 13, 2], row: 6, col: 7 },
  { z: 76, sym: "Os", name: "Osmium", mass: 190.233, group: "transition metal", color: 0xf43f5e, valence: 2, en: 2.2, shells: [2, 8, 18, 32, 14, 2], row: 6, col: 8 },
  { z: 77, sym: "Ir", name: "Iridium", mass: 192.217, group: "transition metal", color: 0xf43f5e, valence: 2, en: 2.2, shells: [2, 8, 18, 32, 15, 2], row: 6, col: 9 },
  { z: 78, sym: "Pt", name: "Platinum", mass: 195.085, group: "transition metal", color: 0xf43f5e, valence: 1, en: 2.28, shells: [2, 8, 18, 32, 17, 1], row: 6, col: 10 },
  { z: 79, sym: "Au", name: "Gold", mass: 196.967, group: "transition metal", color: 0xf43f5e, valence: 1, en: 2.54, shells: [2, 8, 18, 32, 18, 1], row: 6, col: 11 },
  { z: 80, sym: "Hg", name: "Mercury", mass: 200.592, group: "transition metal", color: 0xf43f5e, valence: 2, en: 2, shells: [2, 8, 18, 32, 18, 2], row: 6, col: 12 },
  { z: 81, sym: "Tl", name: "Thallium", mass: 204.38, group: "transition metal", color: 0xf43f5e, valence: 3, en: 1.62, shells: [2, 8, 18, 32, 18, 3], row: 6, col: 13 },
  { z: 82, sym: "Pb", name: "Lead", mass: 207.21, group: "transition metal", color: 0xf43f5e, valence: 4, en: 1.87, shells: [2, 8, 18, 32, 18, 4], row: 6, col: 14 },
  { z: 83, sym: "Bi", name: "Bismuth", mass: 208.98, group: "transition metal", color: 0xf43f5e, valence: 5, en: 2.02, shells: [2, 8, 18, 32, 18, 5], row: 6, col: 15 },
  { z: 84, sym: "Po", name: "Polonium", mass: 209, group: "transition metal", color: 0xf43f5e, valence: 6, en: 2, shells: [2, 8, 18, 32, 18, 6], row: 6, col: 16 },
  { z: 85, sym: "At", name: "Astatine", mass: 210, group: "metalloid", color: 0x06b6d4, valence: 7, en: 2.2, shells: [2, 8, 18, 32, 18, 7], row: 6, col: 17 },
  { z: 86, sym: "Rn", name: "Radon", mass: 222, group: "noble", color: 0xc084fc, valence: 8, en: 2.2, shells: [2, 8, 18, 32, 18, 8], row: 6, col: 18 },
  { z: 87, sym: "Fr", name: "Francium", mass: 223, group: "alkali", color: 0xf97316, valence: 1, en: 0.79, shells: [2, 8, 18, 32, 18, 8, 1], row: 7, col: 1 },
  { z: 88, sym: "Ra", name: "Radium", mass: 226, group: "alkaline earth", color: 0xfacc15, valence: 2, en: 0.9, shells: [2, 8, 18, 32, 18, 8, 2], row: 7, col: 2 },
  { z: 89, sym: "Ac", name: "Actinium", mass: 227, group: "actinide", color: 0xec4899, valence: 2, en: 1.1, shells: [2, 8, 18, 32, 18, 9, 2], row: 10, col: 3 },
  { z: 90, sym: "Th", name: "Thorium", mass: 232.038, group: "actinide", color: 0xec4899, valence: 2, en: 1.3, shells: [2, 8, 18, 32, 18, 10, 2], row: 10, col: 4 },
  { z: 91, sym: "Pa", name: "Protactinium", mass: 231.036, group: "actinide", color: 0xec4899, valence: 2, en: 1.5, shells: [2, 8, 18, 32, 20, 9, 2], row: 10, col: 5 },
  { z: 92, sym: "U", name: "Uranium", mass: 238.029, group: "actinide", color: 0xec4899, valence: 2, en: 1.38, shells: [2, 8, 18, 32, 21, 9, 2], row: 10, col: 6 },
  { z: 93, sym: "Np", name: "Neptunium", mass: 237, group: "actinide", color: 0xec4899, valence: 2, en: 1.36, shells: [2, 8, 18, 32, 22, 9, 2], row: 10, col: 7 },
  { z: 94, sym: "Pu", name: "Plutonium", mass: 244, group: "actinide", color: 0xec4899, valence: 2, en: 1.28, shells: [2, 8, 18, 32, 24, 8, 2], row: 10, col: 8 },
  { z: 95, sym: "Am", name: "Americium", mass: 243, group: "actinide", color: 0xec4899, valence: 2, en: 1.13, shells: [2, 8, 18, 32, 25, 8, 2], row: 10, col: 9 },
  { z: 96, sym: "Cm", name: "Curium", mass: 247, group: "actinide", color: 0xec4899, valence: 2, en: 1.28, shells: [2, 8, 18, 32, 25, 9, 2], row: 10, col: 10 },
  { z: 97, sym: "Bk", name: "Berkelium", mass: 247, group: "actinide", color: 0xec4899, valence: 2, en: 1.3, shells: [2, 8, 18, 32, 27, 8, 2], row: 10, col: 11 },
  { z: 98, sym: "Cf", name: "Californium", mass: 251, group: "actinide", color: 0xec4899, valence: 2, en: 1.3, shells: [2, 8, 18, 32, 28, 8, 2], row: 10, col: 12 },
  { z: 99, sym: "Es", name: "Einsteinium", mass: 252, group: "actinide", color: 0xec4899, valence: 2, en: 1.3, shells: [2, 8, 18, 32, 29, 8, 2], row: 10, col: 13 },
  { z: 100, sym: "Fm", name: "Fermium", mass: 257, group: "actinide", color: 0xec4899, valence: 2, en: 1.3, shells: [2, 8, 18, 32, 30, 8, 2], row: 10, col: 14 },
  { z: 101, sym: "Md", name: "Mendelevium", mass: 258, group: "actinide", color: 0xec4899, valence: 2, en: 1.3, shells: [2, 8, 18, 32, 31, 8, 2], row: 10, col: 15 },
  { z: 102, sym: "No", name: "Nobelium", mass: 259, group: "actinide", color: 0xec4899, valence: 2, en: 1.3, shells: [2, 8, 18, 32, 32, 8, 2], row: 10, col: 16 },
  { z: 103, sym: "Lr", name: "Lawrencium", mass: 266, group: "actinide", color: 0xec4899, valence: 3, en: 1.3, shells: [2, 8, 18, 32, 32, 8, 3], row: 10, col: 17 },
  { z: 104, sym: "Rf", name: "Rutherfordium", mass: 267, group: "transition metal", color: 0xf43f5e, valence: 2, en: null, shells: [2, 8, 18, 32, 32, 10, 2], row: 7, col: 4 },
  { z: 105, sym: "Db", name: "Dubnium", mass: 268, group: "transition metal", color: 0xf43f5e, valence: 2, en: null, shells: [2, 8, 18, 32, 32, 11, 2], row: 7, col: 5 },
  { z: 106, sym: "Sg", name: "Seaborgium", mass: 269, group: "transition metal", color: 0xf43f5e, valence: 2, en: null, shells: [2, 8, 18, 32, 32, 12, 2], row: 7, col: 6 },
  { z: 107, sym: "Bh", name: "Bohrium", mass: 270, group: "transition metal", color: 0xf43f5e, valence: 2, en: null, shells: [2, 8, 18, 32, 32, 13, 2], row: 7, col: 7 },
  { z: 108, sym: "Hs", name: "Hassium", mass: 269, group: "transition metal", color: 0xf43f5e, valence: 2, en: null, shells: [2, 8, 18, 32, 32, 14, 2], row: 7, col: 8 },
  { z: 109, sym: "Mt", name: "Meitnerium", mass: 278, group: "transition metal", color: 0xf43f5e, valence: 2, en: null, shells: [2, 8, 18, 32, 32, 15, 2], row: 7, col: 9 },
  { z: 110, sym: "Ds", name: "Darmstadtium", mass: 281, group: "transition metal", color: 0xf43f5e, valence: 2, en: null, shells: [2, 8, 18, 32, 32, 16, 2], row: 7, col: 10 },
  { z: 111, sym: "Rg", name: "Roentgenium", mass: 282, group: "transition metal", color: 0xf43f5e, valence: 2, en: null, shells: [2, 8, 18, 32, 32, 17, 2], row: 7, col: 11 },
  { z: 112, sym: "Cn", name: "Copernicium", mass: 285, group: "transition metal", color: 0xf43f5e, valence: 2, en: null, shells: [2, 8, 18, 32, 32, 18, 2], row: 7, col: 12 },
  { z: 113, sym: "Nh", name: "Nihonium", mass: 286, group: "transition metal", color: 0xf43f5e, valence: 3, en: null, shells: [2, 8, 18, 32, 32, 18, 3], row: 7, col: 13 },
  { z: 114, sym: "Fl", name: "Flerovium", mass: 289, group: "transition metal", color: 0xf43f5e, valence: 4, en: null, shells: [2, 8, 18, 32, 32, 18, 4], row: 7, col: 14 },
  { z: 115, sym: "Mc", name: "Moscovium", mass: 289, group: "transition metal", color: 0xf43f5e, valence: 5, en: null, shells: [2, 8, 18, 32, 32, 18, 5], row: 7, col: 15 },
  { z: 116, sym: "Lv", name: "Livermorium", mass: 293, group: "transition metal", color: 0xf43f5e, valence: 6, en: null, shells: [2, 8, 18, 32, 32, 18, 6], row: 7, col: 16 },
  { z: 117, sym: "Ts", name: "Tennessine", mass: 294, group: "metalloid", color: 0x06b6d4, valence: 7, en: null, shells: [2, 8, 18, 32, 32, 18, 7], row: 7, col: 17 },
  { z: 118, sym: "Og", name: "Oganesson", mass: 294, group: "noble", color: 0xc084fc, valence: 8, en: null, shells: [2, 8, 18, 32, 32, 18, 8], row: 7, col: 18 }
];
export const getElement = (sym) => ELEMENTS.find((e) => e.sym === sym);

export const getGroupStyles = (group) => {
  switch (group) {
    case "nonmetal":
      return { bg: "#e0f2fe", border: "#7dd3fc", text: "#0369a1" };
    case "noble":
      return { bg: "#f3e8ff", border: "#d8b4fe", text: "#6b21a8" };
    case "alkali":
      return { bg: "#ffedd5", border: "#fdba74", text: "#c2410c" };
    case "alkaline earth":
      return { bg: "#fef9c3", border: "#fde047", text: "#a16207" };
    case "metalloid":
      return { bg: "#ecfeff", border: "#a5f3fc", text: "#0e7490" };
    case "transition metal":
      return { bg: "#ffe4e6", border: "#fecdd3", text: "#be123c" };
    case "lanthanide":
      return { bg: "#fdf2f8", border: "#fbcfe8", text: "#be185d" };
    case "actinide":
      return { bg: "#fff1f2", border: "#fecdd3", text: "#e11d48" };
    default:
      return { bg: "#f1f5f9", border: "#cbd5e1", text: "#475569" };
  }
};
