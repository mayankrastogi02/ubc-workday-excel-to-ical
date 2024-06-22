'use client';
import React, { useState, ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import ical, { ICalEventRepeatingFreq, ICalWeekday } from 'ical-generator';
import { saveAs } from 'file-saver';

const FileUpload: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [done, setDone] = useState<boolean>(false);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0].type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
            setFile(e.target.files[0]);
        }
    };

    const handleFileUpload = () => {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            if (!e.target?.result) return;
            const data = new Uint8Array(e.target.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            const calendar = ical({ name: 'Schedule' });
            json.slice(3).forEach(row => {
                const schedule: string = row[7];
                const section: string = row[4];
                const [dateRange, days, timeRange, location] = schedule.split(' | ');
                const [startDate, endDate] = dateRange.split(' - ');
                const [startTime, endTime] = timeRange.split(' - ');

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

            const blob = new Blob([calendar.toString()], { type: 'text/calendar' });
            saveAs(blob, 'schedule.ics');
            setDone(true);
        };

        reader.readAsArrayBuffer(file);
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
