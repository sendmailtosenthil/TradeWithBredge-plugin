let tabId = 1;

export const TAB_ID_MAP = {
    '1': 'calendar-spread',
    '2': 'target',
    '3': 'stoploss',
};
function showInitialTab(event) {
    document.getElementById('main-content').style.display = 'block';
    const myEvent = new CustomEvent('tab-loaded', {"detail":{"credentials": event.detail.credentials}});
    document.dispatchEvent(myEvent)
}

function addTabClickEventListener() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and tab contents
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const tabEle = document.getElementById(`${tab.dataset.tab}-content`)
            tabEle.classList.add('active');
            tabId = parseInt(activeTab.getAttribute('tab-id'))
        });
    });
}

// Tab switching logic
document.addEventListener('login-success',(event) => {
    showInitialTab(event)
    addTabClickEventListener() 
});

export const getActiveTabId = () => tabId