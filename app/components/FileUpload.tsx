'use client';
import React, { useState, ChangeEvent } from 'react';
import ical, { ICalEventRepeatingFreq, ICalWeekday } from 'ical-generator';
import { saveAs } from 'file-saver';
import Excel from 'exceljs'

// Debug flag - set to true for development, false for production
const DEBUG_MODE = false;

// Logging utility
const debugLog = (message: string, ...args: any[]) => {
    if (DEBUG_MODE) {
        console.log(message, ...args);
    }
};


const FileUpload: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [done, setDone] = useState<boolean>(false);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0].type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
            setFile(e.target.files[0]);
            debugLog('✅ File selected:', e.target.files[0].name);
        } else {
            debugLog('❌ Invalid file type or no file selected');
        }
    };

    const handleFileUpload = async () => {
        if (!file) return;
        debugLog('🚀 Starting file upload and conversion process...');
        debugLog('📁 File name:', file.name);
        debugLog('📏 File size:', file.size, 'bytes');
        
        const workbook = new Excel.Workbook();
        const reader = new FileReader();

        reader.readAsArrayBuffer(file);
        reader.onload = async (e) => {
            debugLog('📖 File read successfully, loading workbook...');
            const buffer = e.target?.result as ArrayBuffer;
            await workbook.xlsx.load(buffer);

            debugLog('📊 Workbook loaded. Number of worksheets:', workbook.worksheets.length);
            const worksheet = workbook.worksheets[0];
            debugLog('📋 Using worksheet:', worksheet.name);
            
            const allRows = worksheet.getSheetValues();
            debugLog('📝 Total rows in worksheet:', allRows.length);
            debugLog('🔍 First 3 rows (headers):', allRows.slice(0, 4));

            // Thank you @spinningbanana for the dynamic header identification approach - u da best
            // Find header row and column indices dynamically
            let headerRowIndex = -1;
            let sectionColumnIndex = -1;
            let meetingPatternsColumnIndex = -1;
            
            // Look for the header row (usually row 3, but let's search dynamically)
            for (let i = 0; i < Math.min(5, allRows.length); i++) {
                const row = allRows[i];
                if (row && Array.isArray(row)) {
                    const sectionIndex = row.findIndex(cell => 
                        typeof cell === 'string' && cell.toLowerCase().includes('section')
                    );
                    const meetingIndex = row.findIndex(cell => 
                        typeof cell === 'string' && cell.toLowerCase().includes('meeting patterns')
                    );
                    
                    if (sectionIndex !== -1 && meetingIndex !== -1) {
                        headerRowIndex = i;
                        sectionColumnIndex = sectionIndex;
                        meetingPatternsColumnIndex = meetingIndex;
                        debugLog('📍 Found headers in row', i + 1);
                        debugLog('📋 Section column:', sectionColumnIndex, '- Meeting Patterns column:', meetingPatternsColumnIndex);
                        break;
                    }
                }
            }
            
            if (sectionColumnIndex === -1 || meetingPatternsColumnIndex === -1) {
                throw new Error('Could not find required columns "Section" and "Meeting Patterns" in the spreadsheet headers');
            }
            
            const rows = allRows.slice(headerRowIndex + 1);  // Skip to data rows after headers
            debugLog('📈 Data rows to process:', rows.length);
            
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
                debugLog('⏰ Parsing time - Date:', date, 'Time:', time);
                const timeMatch = time.match(/(\d+):(\d+) (a\.m\.|p\.m\.)/);
                if (!timeMatch) {
                    debugLog('❌ Time format not recognized:', time);
                    throw new Error(`Invalid time format: ${time}`);
                }
                const [, hour, minute, period] = timeMatch;
                let hours = parseInt(hour, 10);
                if (period === 'p.m.' && hours !== 12) hours += 12;
                if (period === 'a.m.' && hours === 12) hours = 0;
                const result = new Date(`${date}T${hours.toString().padStart(2, '0')}:${minute}:00`);
                debugLog('✅ Parsed time result:', result.toISOString());
                return result;
            };

            const parseDate = (dateStr: string) => {
                debugLog('📅 Parsing date:', dateStr);
                const parts = dateStr.split('-');
                if (parts.length !== 3) {
                    debugLog('❌ Date format not recognized:', dateStr);
                    throw new Error(`Invalid date format: ${dateStr}`);
                }
                const [year, month, day] = parts.map(Number);
                const result = new Date(Date.UTC(year, month - 1, day));
                debugLog('✅ Parsed date result:', result.toISOString());
                return result;
            };

            const getNextValidDate = (startDate: Date, targetDays: ICalWeekday[]) => {
                debugLog('🗓️ Finding next valid date from:', startDate.toISOString(), 'for days:', targetDays);
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
                debugLog('🎯 Target day numbers:', targetDayNumbers);

                for (let i = 0; i < 7; i++) {
                    const nextDay = new Date(startDate);
                    nextDay.setUTCDate(startDate.getUTCDate() + i);
                    if (targetDayNumbers.includes(nextDay.getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6)) {
                        debugLog('✅ Found valid date:', nextDay.toISOString());
                        return nextDay;
                    }
                }
                debugLog('⚠️ No valid date found, returning start date');
                return startDate;
            };

            try {
                debugLog('PROCESSING START: Total data rows:', rows.length);
                let processedCourses = 0;
                let skippedCourses = 0;
                let totalEvents = 0;

                rows.forEach((row: any, index: number) => {
                    const rowNumber = index + headerRowIndex + 2; // Adjust for header position
                    
                    // Critical checkpoint: Row structure analysis
                    if (!row || row.length < 1) {
                        debugLog(`SKIP_EMPTY: Row ${rowNumber} - Empty or null`);
                        skippedCourses++;
                        return;
                    }
                    
                    // Log row structure for debugging
                    debugLog(`ROW_${rowNumber}: Length=${row.length}, Section="${row[sectionColumnIndex]}", MeetingPatterns="${row[meetingPatternsColumnIndex]}"`);
                    
                    if (!row[meetingPatternsColumnIndex]) {
                        debugLog(`SKIP_NO_SCHEDULE: Row ${rowNumber} - Meeting Patterns column empty. Available columns: ${Object.keys(row).join(',')}`);
                        skippedCourses++;
                        return;
                    }

                    const section: string = row[sectionColumnIndex];
                    const scheduleData = row[meetingPatternsColumnIndex];
                    const schedules: string[] = scheduleData.split('\n');
                    
                    debugLog(`PROCESS_ROW_${rowNumber}: Section="${section}", ScheduleRaw="${scheduleData}", SplitCount=${schedules.length}`);
                    processedCourses++;

                    schedules.forEach((schedule, scheduleIndex) => {
                        if (!schedule.trim()) {
                            debugLog(`SKIP_EMPTY_SCHEDULE: Row ${rowNumber}, Schedule ${scheduleIndex}`);
                            return;
                        }

                        debugLog(`PARSE_SCHEDULE: Row ${rowNumber}, Index ${scheduleIndex}, Content="${schedule}"`);

                        try {
                            const parts = schedule.split(' | ');
                            
                            // Handle both old format (4 parts) and new format (7+ parts)
                            let dateRange, days, timeRange, location;
                            
                            if (parts.length === 4) {
                                // Old format: "date | days | time | location"
                                [dateRange, days, timeRange, location] = parts;
                                debugLog(`PARSED_PARTS_OLD: DateRange="${dateRange}", Days="${days}", TimeRange="${timeRange}", Location="${location}"`);
                            } else if (parts.length >= 7) {
                                // New format: "date | days | time | campus | building | floor | room"
                                [dateRange, days, timeRange] = parts;
                                location = parts.slice(3).join(' | '); // Combine all location parts
                                debugLog(`PARSED_PARTS_NEW: DateRange="${dateRange}", Days="${days}", TimeRange="${timeRange}", Location="${location}"`);
                            } else if (parts.length === 3 && parts[2].endsWith(' |')) {
                                // Handle incomplete format like "date | days | time |"
                                [dateRange, days] = parts;
                                timeRange = parts[2].replace(' |', ''); // Remove trailing |
                                location = 'TBD';
                                debugLog(`PARSED_PARTS_INCOMPLETE: DateRange="${dateRange}", Days="${days}", TimeRange="${timeRange}", Location="${location}"`);
                            } else {
                                debugLog(`PARSE_ERROR: Row ${rowNumber} - Expected 4 or 7+ parts, got ${parts.length}. Parts: [${parts.map(p => `"${p}"`).join(', ')}]`);
                                return;
                            }

                            // Validate formats
                            if (!dateRange.includes(' - ')) {
                                debugLog(`FORMAT_ERROR: Invalid date range format: "${dateRange}"`);
                                return;
                            }
                            if (!timeRange.includes(' - ')) {
                                debugLog(`FORMAT_ERROR: Invalid time range format: "${timeRange}"`);
                                return;
                            }

                            const [startDateStr, endDateStr] = dateRange.split(' - ');
                            const [startTime, endTime] = timeRange.split(' - ');
                            
                            const startDate = parseDate(startDateStr);
                            const endDate = parseDate(endDateStr);
                            
                            const daysList = days.split(' ');
                            const eventDays = daysList.map(day => daysOfWeek[day]).filter(day => day !== null);
                            
                            if (eventDays.length === 0) {
                                debugLog(`DAY_MAPPING_ERROR: No valid days found in "${days}". Available: ${Object.keys(daysOfWeek).join(',')}`);
                                return;
                            }
                            
                            const eventTitle = section.split(' - ')[0];
                            const firstEventStartDate = getNextValidDate(startDate, eventDays);
                            const eventStart = parseTime(firstEventStartDate.toISOString().split('T')[0], startTime);
                            const eventEnd = parseTime(firstEventStartDate.toISOString().split('T')[0], endTime);
                            
                            debugLog(`EVENT_CREATE: Title="${eventTitle}", Start=${eventStart.toISOString()}, End=${eventEnd.toISOString()}, Days=${eventDays.join(',')}`);

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
                            
                            totalEvents++;
                            debugLog(`EVENT_SUCCESS: Row ${rowNumber}, Schedule ${scheduleIndex} created successfully`);
                            
                        } catch (scheduleError) {
                            const errorMessage = scheduleError instanceof Error ? scheduleError.message : 'Unknown error';
                            debugLog(`SCHEDULE_ERROR: Row ${rowNumber}, Schedule ${scheduleIndex} - ${errorMessage}`);
                        }
                    });
                });

                debugLog(`PROCESSING_COMPLETE: Processed=${processedCourses}, Skipped=${skippedCourses}, Events=${totalEvents}`);

                const blob = new Blob([calendar.toString()], { type: 'text/calendar' });
                saveAs(blob, 'schedule.ics');
                setDone(true);
                debugLog('FILE_GENERATED: Calendar download initiated');
                
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : 'Unknown error';
                const errorStack = e instanceof Error ? e.stack : 'No stack trace available';
                debugLog('FATAL_ERROR:', errorMessage);
                debugLog('ERROR_STACK:', errorStack);
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