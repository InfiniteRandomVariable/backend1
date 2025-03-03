import { UserRolesEnum } from "../db/types.mts";

export function getRandomNumberInRange(min: number, max: number) {
  // Calculate the range (inclusive of min and max)
  const range = max - min + 1;

  // Generate a random number between 0 (inclusive) and 1 (exclusive)
  const randomNumber = Math.random();

  // Scale the random number to the range and shift it to start at min
  const scaledRandomNumber = randomNumber * range + min;

  // Use Math.floor to round down to the nearest integer
  const randomInteger = Math.floor(scaledRandomNumber);

  return randomInteger;
}
export function getMatchingElements(array1: any[], array2: any[]) {
  // Use the filter method on array1 to create a new array
  const matchingElements = array1.filter((element) => {
    // For each element in array1, check if it exists in array2 using includes()
    return array2.includes(element);
  });
  return matchingElements;
}
export const adminTrailingPassword = "#_#_";
export const staffTrailingPassword = "!_!_!";

export function isPasswordValid(password: string, userRole: string) {
  if (userRole === UserRolesEnum.Admin) {
    return password.endsWith(adminTrailingPassword);
  } else if (userRole === UserRolesEnum.Staff) {
    return password.endsWith(staffTrailingPassword);
  }
}
