import React from 'react'

function Guide() {
    return (
        <div className='mt-24'>
            <h1 className='text-lg'>Guides</h1>
            <div className="divider m-0"></div>
            <div className='text-left'>
                <div tabIndex={0} className="collapse collapse-arrow border border-base-300 bg-base-200">
                    <div className="collapse-title text-lg font-medium">
                        Get course schedule from UBC Workday
                    </div>
                    <div className="collapse-content">
                        <iframe src="https://scribehow.com/embed/Accessing_and_Downloading_Course_Information_in_Workday__zWMAv7lvRpC12h39VmG4Gw?as=scrollable" width="100%" height="640"></iframe>
                    </div>
                </div>
                <div tabIndex={0} className="collapse collapse-arrow border border-base-300 bg-base-200">
                    <div className="collapse-title text-lg font-medium">
                        Add calendar file to Google Calendar
                    </div>
                    <div className="collapse-content">
                        <iframe src="https://scribehow.com/embed/Importing_UBC_Winter_2025_Calendar_into_Google_Calendar__HS7J0rjeT-SA44Z8EwcknQ?as=scrollable" width="100%" height="640"></iframe>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Guide