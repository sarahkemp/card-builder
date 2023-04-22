# CSV Card Builder

This project is a simple editor intended to generate a very specific series of 
CSV-formatted card attributes. The generated file(s) are run through a plugin 
in Inkscape to place the attributes in the templated positions.

## Usage

Open https://sarahkemp.github.io/card-builder/. Drag-and-drop a specifically
structured project folder onto the page.

## Your Project Folder

A specific folder and file structure is required. 

### Required folder: fronts 

This folder should contain a .png image representing each of your card types. 
This is for your reference while filling out the fields and if a front is 
wrong or missing, no harm done.

### Required file: fields.json

This file defines the attributes you intend to collect. Name is required
for every card type. Any number of other attributes may be defined for each
card type in this file. 

"tag" corresponds to an HTML form field tag name. "attr" accepts HTML
attributes allowed for that element. "name" must be unique within a card type.

Sample fields.json:
```javascript
{
    "Type1": [
        {
            "tag": "input",
            "name": "Count",
            "attr": {
                "type": "number",
                "min": "0",
                "max": "40",
                "step": "1",
                "value": "1",
                "size": "2",
                "title": "How many copies of the card to make"
            }
        },
        {
            "tag": "input",
            "name": "HiddenDefault",
            "attr": {
                "type": "hidden",
                "value": "Card-Front-Type1.png"
            }
        },
        {
            "tag": "input",
            "name": "Name"
        },
        {
            "tag": "select",
            "name": "Range",
            "options": {
                "0": "0 - Self",
                "1": "1 - Room",
                "2": "2 - Nearby",
                "3": "3 - Anywhere"
            }
        },
        {
            "tag": "input",
            "name": "Tier",
            "attr": {
                "type": "number",
                "step": "1",
                "min": "1",
                "max": "3",
                "size": "1"
            }
        },
        {
            "tag": "input",
            "name": "Tag1",
            "attr": {
                "size": "6"
            },
            "options": [
                "Cast",
                "React"
            ]
        },
        {
            "tag": "textarea",
            "name": "Description",
            "attr": {
                "rows": "10",
                "columns": "35"
            }
        },
        {
            "tag": "input",
            "name": "Image Select",
            "attr": {
                "type": "text",
                "data-path": "fronts",
                "class": "img-selector",
                "title": "An example of an image selector - front type could instead be determined by this being part of the Type1 group using the HiddenDefault"
            }
        }
    ],
        "Type2": [
        {
            "tag": "input",
            "name": "Name"
        },
        {
            "tag": "input",
            "name": "Color",
            "options": [
                "Red",
                "Green",
                "Blue"
            ]
        }
    ]
}
```

### Optional folder: csv

If you include previously generated .csv files named exactly after any of 
your defined card types in a folder called 'csv', your previously exported
data will be loaded in for further editing. 

### Optional folders to support .img-selector

If you want to use the .img-selector class on an input to have previews shown during 
selection, you need to upload .png files for each desired image option to a folder
in your project folder and reference it in your fields.json using the "attr" "data-path".