'use client';
import React, { useState, ChangeEvent } from 'react';
import ical, { ICalEventRepeatingFreq, ICalWeekday } from 'ical-generator';
import { saveAs } from 'file-saver';
import Excel from 'exceljs'


const FileUpload: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [done, setDone] = useState<boolean>(false);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0].type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
            setFile(e.target.files[0]);
        }
    };

    const handleFileUpload = async () => {
        if (!file) return;
        const workbook = new Excel.Workbook();
        const reader = new FileReader();

        reader.readAsArrayBuffer(file);
        reader.onload = async (e) => {
            const buffer = e.target?.result as ArrayBuffer;
            await workbook.xlsx.load(buffer);

            const worksheet = workbook.worksheets[0];
            const rows = worksheet.getSheetValues().slice(4);  // Skip headers and start from the fourth row
            const calendar = ical({ name: 'Schedule' });

            const daysOfWeek: { [key: string]: ICalWeekday } = {
                'Mon': ICalWeekday.MO,
                'Tue': ICalWeekday.TU,
                'Wed': ICalWeekday.WE,
                'Thu': ICalWeekday.TH,
                'Fri': ICalWeekday.FR,
                'Sat': ICalWeekday.SA,
                'Sun': ICalWeekday.SU,
            };

            const parseTime = (date: string, time: string) => {
                const [hour, minute, period] = time.match(/(\d+):(\d+) (a\.m\.|p\.m\.)/)!.slice(1);
                let hours = parseInt(hour, 10);
                if (period === 'p.m.' && hours !== 12) hours += 12;
                if (period === 'a.m.' && hours === 12) hours = 0;
                return new Date(`${date}T${hours.toString().padStart(2, '0')}:${minute}:00`);
            };

            try {
                rows.forEach((row: any) => {
                    // The course could be an online course that doesn't have a schedule
                    // In this case, we skip the course and move onto the next one
                    if (!row || row.length < 1 || !row[8]) return;
                    const section: string = row[5];
                    const schedules: string[] = row[8].split('\n');

                    schedules.forEach(schedule => {
                        if (!schedule.trim()) return;

                        const [dateRange, days, timeRange, location] = schedule.split(' | ');
                        const [startDate, endDate] = dateRange.split(' - ');
                        const [startTime, endTime] = timeRange.split(' - ');

                        const eventStart = parseTime(startDate, startTime);
                        const eventEnd = parseTime(startDate, endTime);

                        const eventDays = days.split(' ').map(day => daysOfWeek[day]);
                        const eventTitle = section.split(' - ')[0];

                        calendar.createEvent({
                            start: eventStart,
                            end: eventEnd,
                            repeating: {
                                freq: ICalEventRepeatingFreq.WEEKLY,
                                byDay: eventDays,
                                until: new Date(`${endDate}T23:59:59`),
                            },
                            location: location,
                            summary: eventTitle,
                        });
                    });
                });

                const blob = new Blob([calendar.toString()], { type: 'text/calendar' });
                saveAs(blob, 'schedule.ics');
                setDone(true);
            } catch (e) {
                alert('Sorry! Failed to convert file. Please verify the content of the file.');
                console.error(e);
            }
        };
    };

    return (
        <div className='flex flex-col items-center'>
            <div className='relative w-full max-w-xs flex items-center'>
                <input
                    type="file"
                    accept=".xlsx"
                    className="file-input file-input-bordered w-full my-4"
                    onChange={handleFileChange}
                />
                {file && (
                    <span className="text-green-500 mx-2">
                        ✔️
                    </span>
                )}
            </div>
            <button
                className="btn btn-outline"
                onClick={handleFileUpload}
                disabled={!file}
            >
                Upload and Convert
            </button>
            {done && (
                <>
                    <p className="my-4">
                        Please verify the generated schedule.
                    </p>
                    <p className="mt-4">
                        Good luck on your courses! ❤️
                    </p>
                </>
            )}
        </div>
    );
};

export default FileUpload;
