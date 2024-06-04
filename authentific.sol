// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

contract Verify{
    mapping (string => string) public ipfs;
    function addPdfLink(string memory id, string memory link, address payable _to) external payable { 
        if(bytes(ipfs[id]).length > 0){
            revert("Error! Already exist.");
        }
        ipfs[id] = link;
         _to.transfer(msg.value);
    }
    function getPdfLink(string memory id) external view returns (string memory) {
       return ipfs[id];
    }  

    function bulkAddPdfLink(string[] memory id, string[] memory link, address payable _to) external payable {
        for(uint i = 0; i < link.length; i++){
           if(bytes(ipfs[id[i]]).length > 0){
            revert("Error! Already exist.");
                } 
            ipfs[id[i]] = link[i];
        }
         _to.transfer(msg.value);

    }
} 