/// <reference path='../node_modules/vss-web-extension-sdk/typings/vss.d.ts' />
/// <reference path='../node_modules/vss-web-extension-sdk/typings/tfs.d.ts' />

import TFS_WIT_Services = require("TFS/WorkItemTracking/Services");
import TFS_WIT_Contracts = require("TFS/WorkItemTracking/Contracts");
import TFS_WIT_ExtensionContracts = require("TFS/WorkItemTracking/ExtensionContracts");
import TFS_WIT_Client = require("TFS/WorkItemTracking/RestClient");

function calculateCompletion() {
    TFS_WIT_Services.WorkItemFormService.getService()
        .then(service => {
            // Get all work item links
            (<any>service.getWorkItemRelations())
                .then((relations: TFS_WIT_Contracts.WorkItemRelation[]) => {
                
                let childWorkItemIds = getChildWorkItemIds(relations);
                
                if (!childWorkItemIds || !childWorkItemIds.length) {
                    // No child items, clear progres bar
                    ProgressIndicator.clear();
                    return;
                }

                // Retrieve state for child work items
                let witHTTPClient = TFS_WIT_Client.getClient();
                witHTTPClient.getWorkItems(childWorkItemIds, ["System.State"])
                    .then(workItems => {
                        // Calculate number of completed items
                        let numberOfItems = workItems.length;
                        let numberOfCompletedItems = workItems
                            .filter(wi => wi.fields["System.State"] === "Done" || wi.fields["System.State"] === "Closed")
                            .length;

                        // Update progress bar
                        ProgressIndicator.show(numberOfCompletedItems, numberOfItems);
                    });
            });
        });
}

// Register work item form group
VSS.register("progress-form-group", () => {
    return <TFS_WIT_ExtensionContracts.IWorkItemNotificationListener>{
        // Called when a new work item is being loaded in the UI
        onLoaded: (args) => {
            calculateCompletion();
        },

        // Called after the work item has been saved
        onSaved: (args) => {
            calculateCompletion();
        },

        // Called when the work item is reset to its unmodified state (undo)
        onReset: (args) => {
            calculateCompletion();
        },

        // Called when work item is refreshed in the UI
        onRefreshed: () => {
            calculateCompletion();
        },
                
        // Called when a work item is unloaded from the UI
        onUnloaded: () => {},
        
        // Called when a field is changed for the work item
        onFieldChanged: () => {},
    };
});


function getChildWorkItemIds(relations: TFS_WIT_Contracts.WorkItemRelation[]): number[] {
    // Filter links to type "Child"
    let childLinks = relations.filter(r => r.rel === "System.LinkTypes.Hierarchy-Forward");
    // Parse work item id from uri in the form of: ...../####
    let childWorkItemIds = childLinks.map(l => parseInt(l.url.match(/.*\/(\d+)$/)[1], 10));
    
    return childWorkItemIds;
}

// View logic
declare var Circles: any;
class ProgressIndicator {       
    /** Clear progress indicator, displaying nothing */
    public static clear() {
        $("#progress").empty();
    }

    /**
     * Show progress indicator, value will displayed will be percent of current/maximum value.
     *   
     * @param maxValue Maximum value
     * @param value Current value
     */
    public static show(maxValue: number, value: number) {
        const percent = maxValue / value;

        // Use 3rd party library to create progress indicator        
        let circle = (Circles).create({
            id: 'progress',
            maxValue: value,
            value: maxValue,
            colors: ['#BEE3F7', '#45AEEA'],
            text: function () { return Math.floor(this.getPercent()).toString(10) + "%"; },
            duration: 400,
            radius: 80,
            width: 40       
        });
    }    
}