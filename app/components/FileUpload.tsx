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

            const parseDate = (dateStr: string) => {
                const [year, month, day] = dateStr.split('-').map(Number);
                return new Date(Date.UTC(year, month - 1, day));
            };

            const getNextValidDate = (startDate: Date, targetDays: ICalWeekday[]) => {
                const dayOfWeek = startDate.getDay();
                let targetDayNumbers: (0 | 1 | 2 | 3 | 4 | 5 | 6)[] = [];
                targetDayNumbers = targetDays.map(day => {
                    switch (day) {
                        case ICalWeekday.MO: return 1;
                        case ICalWeekday.TU: return 2;
                        case ICalWeekday.WE: return 3;
                        case ICalWeekday.TH: return 4;
                        case ICalWeekday.FR: return 5;
                        case ICalWeekday.SA: return 6;
                        case ICalWeekday.SU: return 0;
                    }
                });

                for (let i = 0; i < 7; i++) {
                    const nextDay = new Date(startDate);
                    nextDay.setUTCDate(startDate.getUTCDate() + i);
                    if (targetDayNumbers.includes(nextDay.getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6)) {
                        return nextDay;
                    }
                }
                return startDate;
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
                        const [startDateStr, endDateStr] = dateRange.split(' - ');
                        const [startTime, endTime] = timeRange.split(' - ');

                        const startDate = parseDate(startDateStr);
                        const endDate = parseDate(endDateStr);
                        const eventDays = days.split(' ').map(day => daysOfWeek[day]);
                        const eventTitle = section.split(' - ')[0];

                        const firstEventStartDate = getNextValidDate(startDate, eventDays);
                        const eventStart = parseTime(firstEventStartDate.toISOString().split('T')[0], startTime);
                        const eventEnd = parseTime(firstEventStartDate.toISOString().split('T')[0], endTime);
                        calendar.createEvent({
                            timezone: 'America/Vancouver',
                            start: eventStart,
                            end: eventEnd,
                            repeating: {
                                freq: ICalEventRepeatingFreq.WEEKLY,
                                byDay: eventDays,
                                until: new Date(`${endDateStr}T23:59:59`),
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
