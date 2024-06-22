# UBC Workday Course Schedule Excel to iCal Converter

This is a simple Next.js application that allows users to upload an Excel file (.xlsx) containing schedule information and converts it to an iCal file compatible with Google or Apple Calendar.

## Features

- Upload .xlsx files using a file input component
- Parse the schedule information from the Excel file
- Convert the schedule to an iCal file
- Download the generated iCal file

## Technologies Used

- Next.js
- React
- TypeScript
- Tailwind CSS
- DaisyUI
- XLSX.js
- ical-generator
- file-saver

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/mayankrastogi02/ubc-workday-excel-to-ical
cd ubc-workday-excel-to-ical
```

2. Install the dependencies:

```bash
npm install
# or
yarn install
```

### Running the App

Start the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Usage

1. Select an `.xlsx` file using the file input. The first three rows of the file should contain the table headers.

2. Once the file is selected, a green checkmark will appear next to the file input, and the "Upload and Convert" button will be enabled.

3. Click the "Upload and Convert" button to generate the iCal file and download it.

## Code Overview

### Components

- **FileUpload**: The main component that handles file upload, parsing, and iCal generation.

### Libraries

- **XLSX.js**: Parses the Excel file.
- **ical-generator**: Generates the iCal file.
- **file-saver**: Saves the generated iCal file to the user's device.

## License

This project is licensed under the MIT License.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [DaisyUI](https://daisyui.com/)
- [XLSX.js](https://github.com/SheetJS/sheetjs)
- [ical-generator](https://github.com/sebbo2002/ical-generator)
- [file-saver](https://github.com/eligrey/FileSaver.js)
