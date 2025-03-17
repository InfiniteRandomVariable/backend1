// Interpreter function to convert enum value to string
import { PhoneModel } from "../db/types.mjs";

export function getPhoneModelName(model: PhoneModel): string {
  switch (model) {
    // Apple iPhone models
    case PhoneModel.IPhone7:
      return "iPhone 7";
    case PhoneModel.IPhone7Plus:
      return "iPhone 7 Plus";
    case PhoneModel.IPhone8:
      return "iPhone 8";
    case PhoneModel.IPhone8Plus:
      return "iPhone 8 Plus";
    case PhoneModel.IPhoneX:
      return "iPhone X";
    case PhoneModel.IPhoneXR:
      return "iPhone XR";
    case PhoneModel.IPhoneXS:
      return "iPhone XS";
    case PhoneModel.IPhoneXSMax:
      return "iPhone XS Max";
    case PhoneModel.IPhone11:
      return "iPhone 11";
    case PhoneModel.IPhone11Pro:
      return "iPhone 11 Pro";
    case PhoneModel.IPhone11ProMax:
      return "iPhone 11 Pro Max";
    case PhoneModel.IPhone12:
      return "iPhone 12";
    case PhoneModel.IPhone12Mini:
      return "iPhone 12 Mini";
    case PhoneModel.IPhone12Pro:
      return "iPhone 12 Pro";
    case PhoneModel.IPhone12ProMax:
      return "iPhone 12 Pro Max";
    case PhoneModel.IPhone13:
      return "iPhone 13";
    case PhoneModel.IPhone13Mini:
      return "iPhone 13 Mini";
    case PhoneModel.IPhone13Pro:
      return "iPhone 13 Pro";
    case PhoneModel.IPhone13ProMax:
      return "iPhone 13 Pro Max";
    case PhoneModel.IPhone14:
      return "iPhone 14";
    case PhoneModel.IPhone14Plus:
      return "iPhone 14 Plus";
    case PhoneModel.IPhone14Pro:
      return "iPhone 14 Pro";
    case PhoneModel.IPhone14ProMax:
      return "iPhone 14 Pro Max";
    case PhoneModel.IPhone15:
      return "iPhone 15";
    case PhoneModel.IPhone15Plus:
      return "iPhone 15 Plus";
    case PhoneModel.IPhone15Pro:
      return "iPhone 15 Pro";
    case PhoneModel.IPhone15ProMax:
      return "iPhone 15 Pro Max";
    case PhoneModel.IPhone16:
      return "iPhone 16";
    case PhoneModel.IPhone16Plus:
      return "iPhone 16 Plus";
    case PhoneModel.IPhone16Pro:
      return "iPhone 16 Pro";
    case PhoneModel.IPhone16ProMax:
      return "iPhone 16 Pro Max";
    case PhoneModel.IPhoneSE2:
      return "iPhone SE (2nd Gen)";
    case PhoneModel.IPhoneSE3:
      return "iPhone SE (3rd Gen)";

    case PhoneModel.IPhone17:
      return "iPhone 17";
    case PhoneModel.IPhone17Plus:
      return "iPhone 17 Plus";
    case PhoneModel.IPhone17Pro:
      return "iPhone 17 Pro";
    case PhoneModel.IPhone17ProMax:
      return "iPhone 17 Pro Max";

    // Samsung Galaxy models
    case PhoneModel.GalaxyS7:
      return "Samsung Galaxy S7";
    case PhoneModel.GalaxyS7Edge:
      return "Samsung Galaxy S7 Edge";
    case PhoneModel.GalaxyS8:
      return "Samsung Galaxy S8";
    case PhoneModel.GalaxyS8Plus:
      return "Samsung Galaxy S8 Plus";
    case PhoneModel.GalaxyS9:
      return "Samsung Galaxy S9";
    case PhoneModel.GalaxyS9Plus:
      return "Samsung Galaxy S9 Plus";
    case PhoneModel.GalaxyS10:
      return "Samsung Galaxy S10";
    case PhoneModel.GalaxyS10Plus:
      return "Samsung Galaxy S10 Plus";
    case PhoneModel.GalaxyS10e:
      return "Samsung Galaxy S10e";
    case PhoneModel.GalaxyS20:
      return "Samsung Galaxy S20";
    case PhoneModel.GalaxyS20Plus:
      return "Samsung Galaxy S20 Plus";
    case PhoneModel.GalaxyS20Ultra:
      return "Samsung Galaxy S20 Ultra";
    case PhoneModel.GalaxyS21:
      return "Samsung Galaxy S21";
    case PhoneModel.GalaxyS21Plus:
      return "Samsung Galaxy S21 Plus";
    case PhoneModel.GalaxyS21Ultra:
      return "Samsung Galaxy S21 Ultra";
    case PhoneModel.GalaxyS22:
      return "Samsung Galaxy S22";
    case PhoneModel.GalaxyS22Plus:
      return "Samsung Galaxy S22 Plus";
    case PhoneModel.GalaxyS22Ultra:
      return "Samsung Galaxy S22 Ultra";
    case PhoneModel.GalaxyS23:
      return "Samsung Galaxy S23";
    case PhoneModel.GalaxyS23Plus:
      return "Samsung Galaxy S23 Plus";
    case PhoneModel.GalaxyS23Ultra:
      return "Samsung Galaxy S23 Ultra";
    case PhoneModel.GalaxyS24:
      return "Samsung Galaxy S24";
    case PhoneModel.GalaxyS24Plus:
      return "Samsung Galaxy S24 Plus";
    case PhoneModel.GalaxyS24Ultra:
      return "Samsung Galaxy S24 Ultra";
    case PhoneModel.GalaxyS25:
      return "Samsung Galaxy S25";
    case PhoneModel.GalaxyS25Plus:
      return "Samsung Galaxy S25 Plus";
    case PhoneModel.GalaxyS25Ultra:
      return "Samsung Galaxy S25 Ultra";
    case PhoneModel.GalaxyA14:
      return "Samsung Galaxy A14";
    case PhoneModel.GalaxyA15:
      return "Samsung Galaxy A15";
    case PhoneModel.GalaxyA54:
      return "Samsung Galaxy A54";
    case PhoneModel.GalaxyZFlip5:
      return "Samsung Galaxy Z Flip 5";
    case PhoneModel.GalaxyZFold5:
      return "Samsung Galaxy Z Fold 5";
    case PhoneModel.GalaxyZFlip6:
      return "Samsung Galaxy Z Flip 6";
    case PhoneModel.GalaxyZFold6:
      return "Samsung Galaxy Z Fold 6";

    // Google Pixel models
    case PhoneModel.Pixel3:
      return "Google Pixel 3";
    case PhoneModel.Pixel3XL:
      return "Google Pixel 3 XL";
    case PhoneModel.Pixel4:
      return "Google Pixel 4";
    case PhoneModel.Pixel4XL:
      return "Google Pixel 4 XL";
    case PhoneModel.Pixel5:
      return "Google Pixel 5";
    case PhoneModel.Pixel6:
      return "Google Pixel 6";
    case PhoneModel.Pixel6Pro:
      return "Google Pixel 6 Pro";
    case PhoneModel.Pixel7:
      return "Google Pixel 7";
    case PhoneModel.Pixel7Pro:
      return "Google Pixel 7 Pro";
    case PhoneModel.Pixel8:
      return "Google Pixel 8";
    case PhoneModel.Pixel8Pro:
      return "Google Pixel 8 Pro";
    case PhoneModel.Pixel9:
      return "Google Pixel 9";
    case PhoneModel.Pixel9Pro:
      return "Google Pixel 9 Pro";
    case PhoneModel.Pixel9ProXL:
      return "Google Pixel 9 Pro XL";
    case PhoneModel.Pixel9ProFold:
      return "Google Pixel 9 Pro Fold";
    case PhoneModel.Pixel8a:
      return "Google Pixel 8a";

    // Motorola models
    case PhoneModel.MotoGPower2023:
      return "Motorola Moto G Power (2023)";
    case PhoneModel.MotoGStylus2023:
      return "Motorola Moto G Stylus (2023)";
    case PhoneModel.MotoEdge2023:
      return "Motorola Moto Edge (2023)";
    case PhoneModel.MotoRazr2023:
      return "Motorola Moto Razr (2023)";
    case PhoneModel.MotoRazrPlus2024:
      return "Motorola Moto Razr+ (2024)";
    case PhoneModel.MotoEdge2024:
      return "Motorola Moto Edge (2024)";

    // OnePlus models
    case PhoneModel.OnePlus8:
      return "OnePlus 8";
    case PhoneModel.OnePlus8Pro:
      return "OnePlus 8 Pro";
    case PhoneModel.OnePlus9:
      return "OnePlus 9";
    case PhoneModel.OnePlus9Pro:
      return "OnePlus 9 Pro";
    case PhoneModel.OnePlus10Pro:
      return "OnePlus 10 Pro";
    case PhoneModel.OnePlus11:
      return "OnePlus 11";
    case PhoneModel.OnePlus12:
      return "OnePlus 12";
    case PhoneModel.OnePlus13:
      return "OnePlus 13";

    // Other notable brands
    case PhoneModel.NokiaG400:
      return "Nokia G400";
    case PhoneModel.XiaomiRedmiNote13:
      return "Xiaomi Redmi Note 13";
    case PhoneModel.SonyXperia1V:
      return "Sony Xperia 1 V";

    default:
      return "Unknown Model";
  }
}
