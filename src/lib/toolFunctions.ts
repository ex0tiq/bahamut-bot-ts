import fs from "fs";
import p from "path";
import { FileData } from "../../typings.js";
import { readFileSync } from 'fs';

const randomIntBetween = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const flipString = (string: string) => {
    const normal = "abcdefghijklmnopqrstuvwxyz_,;.?!/\\'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        split = "ɐqɔpǝɟbɥıظʞןɯuodbɹsʇnʌʍxʎz‾'؛˙¿¡/\\,∀qϽᗡƎℲƃHIſʞ˥WNOԀὉᴚS⊥∩ΛMXʎZ0ƖᄅƐㄣϛ9ㄥ86";

    let newstr = "";
    let letter;
    for (let i = 0; i < string.length; i++) {
        letter = string.charAt(i);

        const a = normal.indexOf(letter);
        newstr += (a != -1) ? split.charAt(a) : letter;
    }
    return newstr.split("").reverse().join("");
};

const numberWithCommas = (x: number) => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const flattenArray = (arr: any[]): any[] => {
    return arr.reduce(function(flat, toFlatten) {
        return flat.concat(Array.isArray(toFlatten) ? flattenArray(toFlatten) : toFlatten);
    }, []);
};

const bigintValuesToString = (obj: any) => {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === "bigint"
            ? value.toString()
            : value
    ));
};

const encodeYoutubeURL = (url: string) => {
    return encodeURI(url
        .replace(/\s/g, "+")
    );
};

const getAllFiles = async (path: string, foldersOnly = false) => {
    const files = fs.readdirSync(path, {
      withFileTypes: true,
    });
    let filesFound: FileData[] = [];
  
    for (const file of files) {
      const filePath = p.join(path, file.name);
  
      if (file.isDirectory()) {
        if (foldersOnly) {
          filesFound.push({
            filePath,
            fileContents: file,
          });
        } else {
          filesFound = [...filesFound, ...(await getAllFiles(filePath))];
        }
        continue;
      }
  
      let fileContents;
      if (file.name.endsWith(".json")) {
        fileContents = JSON.parse(
          readFileSync(filePath, "utf-8")
        );
      } else {
        fileContents = await import(filePath);
      }

      filesFound.push({
        filePath,
        fileContents: fileContents?.default || fileContents,
      });
    }
  
    return filesFound;
  };

const getAllJSFiles = async (path: string, foldersOnly = false) => {
    return (await getAllFiles(path, foldersOnly)).filter(e => e.filePath.endsWith(".js"));
};

const toProperCase = (str: string) => {
    return str.replace(/([^\W_]+[^\s-]*) */g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

const hexToRGB = (hex: string): number[] | null => {
    if (hex.startsWith("#")) hex = hex.slice(1);

    //  Make it a valid hex color value (3 -> 6)
    if (hex.length === 3) hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;

    //  Make a rgb color value array
    const red = parseInt(hex.substring(0, 2), 16),
        green = parseInt(hex.substring(2, 4), 16),
        blue = parseInt(hex.substring(4, 6), 16);

    //  Not valid hex color passed
    if(isNaN(red) || isNaN(green) || isNaN(blue)) return null;


    //  Return a RGB color representation of a HEX color
    //  in the array of [red, green, blue] color values
    //  of number types
    return [ red, green, blue ];
};

export { randomIntBetween, flipString, numberWithCommas, flattenArray, bigintValuesToString, encodeYoutubeURL, getAllFiles, getAllJSFiles, toProperCase, hexToRGB };